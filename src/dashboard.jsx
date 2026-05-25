import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';

export default function Dashboard() {
    const [client, setClient] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // State untuk total inventaris (diambil dari panjang daftar di dalam useRef)
    const [inventoryCount, setInventoryCount] = useState(0);

    // State untuk memantau status online/offline tiap node
    const [nodeStatus, setNodeStatus] = useState({
        node1: 'Offline',
        node2: 'Offline',
        node3: 'Offline',
    });

    // State untuk menyimpan daftar riwayat aktivitas
    const [logs, setLogs] = useState([]);

    // FITUR CERDAS: Menyimpan memori UID apa saja yang saat ini ada di dalam gudang
    const insideUidsRef = useRef([]);

    useEffect(() => {
        // Terhubung ke HiveMQ Private Cluster dengan Secure WebSocket
        const mqttClient = mqtt.connect('wss://4ce75d10ff4e45c48dedad19ef64c5c1.s1.eu.hivemq.cloud:8884/mqtt', {
            clientId: `react_warehouse_${Math.random().toString(16).substr(2, 8)}`,
            username: 'kel5sisnamd',
            password: '2M@wvfD35qZAuNk'
        });

        mqttClient.on('connect', () => {
            setIsConnected(true);
            mqttClient.subscribe('gudang_kel5/#', (err) => {
                if (!err) console.log('Berhasil subscribe ke topik gudang_kel5/#');
            });
        });

        mqttClient.on('disconnect', () => {
            setIsConnected(false);
        });

        mqttClient.on('message', (topic, message) => {
            const payload = message.toString();
            const timestamp = new Date().toLocaleTimeString();

            // 1. Logika Cerdas Gerbang Masuk (Node 1)
            if (topic === 'gudang_kel5/sensor/masuk') {
                const currentInside = insideUidsRef.current;

                // Cek apakah UID sudah ada di dalam gudang?
                if (!currentInside.includes(payload)) {
                    // Jika belum, izinkan masuk dan tambahkan ke memori
                    insideUidsRef.current = [...currentInside, payload];
                    setInventoryCount(insideUidsRef.current.length);
                    setLogs((prev) => [
                        { timestamp, type: 'Masuk (Valid)', message: `Akses Diterima: ${payload} masuk ke gudang.`, color: 'text-green-600' },
                        ...prev
                    ]);

                    // PERBAIKAN: Perintahkan Node 3 Buka Pintu
                    mqttClient.publish('gudang_kel5/control/pintu', `VALID_MASUK:${payload}`);

                } else {
                    // Jika sudah ada, tolak aksesnya (Anti-Passback)
                    setLogs((prev) => [
                        { timestamp, type: 'Ditolak (Masuk)', message: `Akses Ditolak: ${payload} sudah berada di dalam gudang!`, color: 'text-orange-500' },
                        ...prev
                    ]);

                    // PERBAIKAN: Perintahkan Node 3 Tolak Akses
                    mqttClient.publish('gudang_kel5/control/pintu', 'TOLAK');
                }
            }

            // 2. Logika Cerdas Gerbang Keluar (Node 2)
            if (topic === 'gudang_kel5/sensor/keluar') {
                const currentInside = insideUidsRef.current;

                // Cek apakah UID tersebut benar-benar ada di dalam gudang?
                if (currentInside.includes(payload)) {
                    // Jika ada, izinkan keluar dan hapus dari memori
                    insideUidsRef.current = currentInside.filter(uid => uid !== payload);
                    setInventoryCount(insideUidsRef.current.length);
                    setLogs((prev) => [
                        { timestamp, type: 'Keluar (Valid)', message: `Akses Diterima: ${payload} keluar dari gudang.`, color: 'text-red-600' },
                        ...prev
                    ]);

                    // PERBAIKAN: Perintahkan Node 3 Buka Pintu
                    mqttClient.publish('gudang_kel5/control/pintu', `VALID_KELUAR:${payload}`);

                } else {
                    // Jika tidak ada di dalam, tolak akses keluarnya
                    setLogs((prev) => [
                        { timestamp, type: 'Ditolak (Keluar)', message: `Akses Ditolak: ${payload} tidak terdaftar di dalam gudang!`, color: 'text-orange-500' },
                        ...prev
                    ]);

                    // PERBAIKAN: Perintahkan Node 3 Tolak Akses
                    mqttClient.publish('gudang_kel5/control/pintu', 'TOLAK');
                }
            }

            // 3. Handle data status keaktifan node (LWT)
            if (topic.startsWith('gudang_kel5/status/')) {
                const nodeName = topic.split('/')[2];
                setNodeStatus((prev) => ({
                    ...prev,
                    [nodeName]: payload,
                }));
            }
        });

        setClient(mqttClient);

        return () => {
            if (mqttClient) mqttClient.end();
        };
    }, []);

    // Fungsi untuk mempublikasikan perintah buka pintu manual
    const handleOpenDoor = () => {
        if (client && isConnected) {
            client.publish('gudang_kel5/control/pintu', 'OPEN', { qos: 1, retain: false });
            const timestamp = new Date().toLocaleTimeString();
            setLogs((prev) => [
                { timestamp, type: 'Kendali Manual', message: 'Perintah "OPEN" dikirim ke Pusat Kendali', color: 'text-blue-600' },
                ...prev
            ]);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6 font-sans">
            {/* Header */}
            <div className="mb-6 flex flex-col justify-between items-start md:flex-row md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Smart Warehouse Security & Inventory</h1>
                    <p className="text-sm text-gray-500">Sistem Pemantauan dan Kendali Gudang Terpusat</p>
                </div>
                <div className="mt-2 md:mt-0 flex items-center space-x-2">
                    <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="text-sm font-medium text-gray-700">
                        {isConnected ? 'Terhubung ke Broker' : 'Terputus dari Broker'}
                    </span>
                </div>
            </div>

            {/* Grid Utama */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Card Ringkasan Inventaris */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Personel / Barang di Dalam</h2>
                    <div className="mt-4 flex items-baseline">
                        <span className="text-5xl font-extrabold text-indigo-600">{inventoryCount}</span>
                        <span className="ml-2 text-sm text-gray-500">entitas valid</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">*Memiliki fitur Anti-Passback (mencegah akses ganda)</p>
                </div>

                {/* Card Status Keaktifan Alat */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Status Koneksi Perangkat</h2>
                    <div className="space-y-3">
                        {Object.entries(nodeStatus).map(([node, status]) => (
                            <div key={node} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-none">
                                <span className="text-sm font-medium text-gray-700 capitalize">{node.replace('node', 'Node ')}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card Pusat Kendali Manual */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Aksi Pengontrolan</h2>
                        <p className="text-xs text-gray-400 mb-4">Gunakan tombol di bawah untuk membuka akses masuk secara paksa dari jarak jauh.</p>
                    </div>
                    <button
                        onClick={handleOpenDoor}
                        disabled={!isConnected}
                        className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-colors shadow-md ${isConnected ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                        Buka Pintu Utama (Publish OPEN)
                    </button>
                </div>
            </div>

            {/* Tabel Log Aktivitas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-md font-bold text-gray-700">Log Aktivitas Real-time</h2>
                </div>
                <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                        <thead className="bg-gray-100 font-semibold text-gray-600 sticky top-0">
                            <tr>
                                <th className="p-4">Waktu</th>
                                <th className="p-4">Kategori</th>
                                <th className="p-4">Keterangan Aktivitas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-gray-400 italic">
                                        Belum ada aktivitas terdeteksi. Silakan tempelkan kartu di Wokwi atau klik tombol kendali.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-500 font-mono">{log.timestamp}</td>
                                        <td className={`p-4 font-bold ${log.color}`}>{log.type}</td>
                                        <td className="p-4 text-gray-700">{log.message}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
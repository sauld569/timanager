import React, { useState, useEffect } from 'react';
import { Button, Table, message } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import axios from 'axios';
import RequestModal from './RequestModal';

interface InventoryItem {
  _id: string;
  descripcion: string;
  marca: string;
  modelo: string;
  proveedor: string;
  unidad: string;
  precioUnitario: number;
  cantidad: number;
  numerosSerie: string[];
  categorias: string[];
}

const InventoryList: React.FC<{ tipo: 'INTERIOR' | 'EXTERIOR' }> = ({ tipo }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/inventory/${tipo.toLowerCase()}`);
      setItems(response.data as InventoryItem[]);
    } catch (error: any) {
      message.error('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [tipo]);

  const handleRequestClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowRequestModal(true);
  };

  const columns = [
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion'
    },
    {
      title: 'Marca',
      dataIndex: 'marca',
      key: 'marca'
    },
    {
      title: 'Modelo',
      dataIndex: 'modelo',
      key: 'modelo'
    },
    {
      title: 'Proveedor',
      dataIndex: 'proveedor',
      key: 'proveedor'
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad'
    },
    {
      title: 'Precio Unitario',
      dataIndex: 'precioUnitario',
      key: 'precioUnitario',
      render: (precio: number) => `$${precio.toFixed(2)}`
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_: any, record: InventoryItem) => (
        <Button 
          type="primary"
          onClick={() => handleRequestClick(record)}
        >
          Crear Solicitud
        </Button>
      )
    }
  ];

  return (
    <div>
      <h2>Inventario {tipo}</h2>
      
      <Table
        columns={columns}
        dataSource={items}
        rowKey="_id"
        pagination={pagination}
        onChange={setPagination}
        loading={loading}
      />

      {selectedItem && (
        <RequestModal
          isVisible={showRequestModal}
          onClose={() => {
            setShowRequestModal(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
          inventarioTipo={tipo}
          onSuccess={() => {
            fetchItems();
            message.success('Solicitud creada exitosamente');
          }}
        />
      )}
    </div>
  );
};

export default InventoryList;

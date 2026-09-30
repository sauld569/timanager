import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import axios from 'axios';

interface RequestModalProps {
  isVisible: boolean;
  onClose: () => void;
  item: any;
  inventarioTipo: 'INTERIOR' | 'EXTERIOR';
  onSuccess: () => void;
}

const RequestModal: React.FC<RequestModalProps> = ({
  isVisible,
  onClose,
  item,
  inventarioTipo,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [formValid, setFormValid] = useState(false);

  // Monitorear cambios en el formulario
  const onFieldsChange = async () => {
    try {
      // Validar todos los campos
      await form.validateFields();
      setFormValid(true);
    } catch (error) {
      setFormValid(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!formValid) {
      message.error('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      const requestData = {
        tipoMovimiento: values.tipoMovimiento,
        inventarioTipo,
        itemId: item._id,
        cantidad: values.cantidad,
        motivoSolicitud: values.motivoSolicitud,
        numerosSerie: values.numerosSerie ? [values.numerosSerie] : []
      };

      await axios.post('/api/inventory-requests', requestData);
      
      message.success(
        `Solicitud de ${values.tipoMovimiento.toLowerCase()} creada exitosamente. ` +
        'Espere la aprobación del administrador.'
      );
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Crear Solicitud de Movimiento"
      open={isVisible}
      onCancel={onClose}
      okText="Crear Solicitud"
      cancelText="Cancelar"
      confirmLoading={loading}
      okButtonProps={{ disabled: !formValid }}
      onOk={() => form.submit()}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onFieldsChange={onFieldsChange}
        initialValues={{
          tipoMovimiento: 'SALIDA',
          cantidad: 1
        }}
      >
        <Form.Item
          name="tipoMovimiento"
          label="Tipo de Movimiento"
          rules={[{ required: true }]}
        >
          <Select>
            <Select.Option value="ENTRADA">Entrada</Select.Option>
            <Select.Option value="SALIDA">Salida</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="cantidad"
          label="Cantidad"
          rules={[
            { required: true, message: 'Por favor ingrese la cantidad' },
            { type: 'number', min: 1, message: 'La cantidad debe ser mayor a 0' },
            {
              validator: (_rule, value) => {
                if (form.getFieldValue('tipoMovimiento') === 'SALIDA' && value > item.cantidad) {
                  return Promise.reject('No hay suficiente cantidad disponible');
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <InputNumber min={1} max={form.getFieldValue('tipoMovimiento') === 'SALIDA' ? item.cantidad : undefined} style={{ width: '100%' }} />
        </Form.Item>

        {item.numerosSerie && item.numerosSerie.length > 0 && (
          <Form.Item
            name="numerosSerie"
            label="Número de Serie"
            rules={[
              {
                validator: (_, value) => {
                  if (form.getFieldValue('tipoMovimiento') === 'SALIDA' && 
                      !item.numerosSerie.includes(value)) {
                    return Promise.reject('Número de serie no válido');
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Select
              showSearch
              placeholder="Seleccione un número de serie"
              optionFilterProp="children"
            >
              {item.numerosSerie.map((serie: string) => (
                <Select.Option key={serie} value={serie}>
                  {serie}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          name="motivoSolicitud"
          label="Motivo de la Solicitud"
          rules={[
            { required: true, message: 'Por favor ingrese el motivo de la solicitud' },
            { min: 10, message: 'El motivo debe tener al menos 10 caracteres' }
          ]}
        >
          <Input.TextArea 
            rows={4} 
            placeholder="Describa el motivo de la solicitud"
            showCount 
            maxLength={500}
          />
        </Form.Item>

      </Form>
    </Modal>
  );
};

export default RequestModal;

import React, { useState, useEffect } from 'react';
import { Card, Button, Collapse, Modal, Form, DatePicker, message, Upload, Tooltip, Radio } from 'antd';
import { PlusOutlined, DeleteOutlined, FileOutlined, PictureOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import '../components/colaboradores/Colaboradores.css';

interface Colaborador {
  _id: string;
  numeroEmpleado: number;
  nombre: string;
  fotografia?: string;
}

interface Documento {
  _id: string;
  nombre: string;
  url: string;
  tipo: 'pdf' | 'image';
  fechaSubida: string;
  fechaVencimiento?: string;
}

type FilterType = 'todos' | 'pdf' | 'image';

interface EditDocumentState {
  visible: boolean;
  documento: Documento | null;
  colaboradorId: string;
}
const API_URL = import.meta.env.VITE_API_URL;

const Papeleria: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [documentos, setDocumentos] = useState<{ [key: string]: Documento[] }>({});
  const [filtrosDocumentos, setFiltrosDocumentos] = useState<{ [key: string]: FilterType }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalState, setEditModalState] = useState<EditDocumentState>({
    visible: false,
    documento: null,
    colaboradorId: ''
  });
  const [selectedColaborador, setSelectedColaborador] = useState<string>('');
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const fetchColaboradores = async () => {
    try {
        const response = await axios.get<Colaborador[]>(`${API_URL}colaboradores`);
      if (Array.isArray(response.data)) {
        setColaboradores(response.data);
      } else {
        setColaboradores([]);
        message.error('Error en el formato de datos de colaboradores');
      }
    } catch (error) {
      setColaboradores([]);
      message.error('Error al cargar colaboradores');
    }
  };

  const fetchDocumentos = async (colaboradorId: string) => {
    try {
        const response = await axios.get<Documento[]>(`${API_URL}documentos/colaborador/${colaboradorId}`);
      setDocumentos(prev => ({
        ...prev,
        [colaboradorId]: response.data
      }));
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      message.error('Error al cargar documentos');
    }
  };

  useEffect(() => {
    fetchColaboradores();
  }, []);

  const handlePanelChange = (key: string | string[]) => {
    const colaboradorId = Array.isArray(key) ? key[key.length - 1] : key;
    if (colaboradorId && !documentos[colaboradorId]) {
      fetchDocumentos(colaboradorId);
    }
  };

  const handleAddDocument = async (values: any) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      if (values.documento && values.documento[0]) {
        const file = values.documento[0].originFileObj;
        formData.append('documento', file);
      } else {
        throw new Error('No se seleccionó ningún archivo');
      }

      formData.append('nombre', values.nombre);
      formData.append('colaboradorId', selectedColaborador);
      if (values.fechaVencimiento) {
        formData.append('fechaVencimiento', values.fechaVencimiento.toISOString());
      }

        await axios.post(`${API_URL}documentos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      message.success('Documento agregado correctamente');
      fetchDocumentos(selectedColaborador);
      setModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      console.error('Error al agregar documento:', error);
      message.error(error.response?.data?.message || error.message || 'Error al agregar documento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, colaboradorId: string) => {
    try {
        await axios.delete(`${API_URL}documentos/${documentId}`);
      message.success('Documento eliminado correctamente');
      fetchDocumentos(colaboradorId);
    } catch (error) {
      message.error('Error al eliminar documento');
    }
  };

  const handleEditDocument = async (values: any) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      if (values.documento && values.documento[0]) {
        const file = values.documento[0].originFileObj;
        formData.append('documento', file);
      }

      formData.append('nombre', values.nombre);
      if (values.fechaVencimiento) {
        formData.append('fechaVencimiento', values.fechaVencimiento.toISOString());
      }

        await axios.put(
          `${API_URL}documentos/${editModalState.documento?._id}`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      message.success('Documento actualizado correctamente');
      fetchDocumentos(editModalState.colaboradorId);
      setEditModalState({ visible: false, documento: null, colaboradorId: '' });
      editForm.resetFields();
    } catch (error: any) {
      console.error('Error al actualizar documento:', error);
      message.error(error.response?.data?.message || error.message || 'Error al actualizar documento');
    } finally {
      setLoading(false);
    }
  };

  const renderDocumentos = (colaborador: Colaborador) => {
    const filtroActual = filtrosDocumentos[colaborador._id] || 'todos';
    const docsFiltered = documentos[colaborador._id]?.filter(doc => 
      filtroActual === 'todos' || doc.tipo === filtroActual
    ) || [];

    return (
      <>
        <div style={{ marginBottom: 16 }}>
          <Radio.Group
            value={filtroActual}
            onChange={(e) => setFiltrosDocumentos({
              ...filtrosDocumentos,
              [colaborador._id]: e.target.value as FilterType
            })}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="todos">Todos</Radio.Button>
            <Radio.Button value="pdf">PDFs</Radio.Button>
            <Radio.Button value="image">Imágenes</Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {docsFiltered.map((doc) => (
            <Card 
              key={doc._id}
              size="small"
              title={doc.nombre}
              extra={
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Tooltip title="Editar">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditModalState({
                          visible: true,
                          documento: doc,
                          colaboradorId: colaborador._id
                        });
                        editForm.setFieldsValue({
                          nombre: doc.nombre,
                          fechaVencimiento: doc.fechaVencimiento ? moment(doc.fechaVencimiento) : undefined
                        });
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <DeleteOutlined 
                      onClick={() => handleDeleteDocument(doc._id, colaborador._id)}
                      style={{ color: 'red', cursor: 'pointer' }}
                    />
                  </Tooltip>
                </div>
              }
            >
              <p>
                  {doc.tipo === 'pdf' ? <FileOutlined /> : <PictureOutlined />}
                  <a 
                    href={`${API_URL}documentos/ver/${doc.url.split('/').pop()}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ marginLeft: '8px' }}
                >
                  Ver documento
                </a>
              </p>
              <p>Fecha: {moment(doc.fechaSubida).format('DD/MM/YYYY')}</p>
              {doc.fechaVencimiento && (
                <p>Vence: {moment(doc.fechaVencimiento).format('DD/MM/YYYY')}</p>
              )}
            </Card>
          ))}
        </div>
      </>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Documentos</h1>
      <div style={{ marginTop: '20px' }}>
        <Collapse onChange={handlePanelChange}>
          {colaboradores.map(colaborador => (
            <Collapse.Panel
              key={colaborador._id}
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img 
                    src={colaborador.fotografia ? 
                      `http://localhost:6051/api/colaboradores/foto/${colaborador.fotografia.split('/').pop()}` 
                      : '/test.png'
                    } 
                    alt={colaborador.nombre}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = '/test.png';
                    }}
                  />
                  <span>ID: {colaborador.numeroEmpleado} - {colaborador.nombre}</span>
                </div>
              }
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setSelectedColaborador(colaborador._id);
                    setModalVisible(true);
                  }}
                >
                  Agregar Documento
                </Button>
              }
            >
              {renderDocumentos(colaborador)}
            </Collapse.Panel>
          ))}
        </Collapse>
      </div>

      <Modal
        title="Agregar Documento"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddDocument}
        >
          <Form.Item
            name="nombre"
            label="Nombre del documento"
            rules={[{ required: true, message: 'Por favor ingresa un nombre' }]}
          >
            <input type="text" className="ant-input" />
          </Form.Item>

          <Form.Item
            name="documento"
            label="Documento"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
            rules={[{ required: true, message: 'Por favor selecciona un documento' }]}
          >
            <Upload.Dragger
              name="documento"
              beforeUpload={() => false}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              maxCount={1}
              listType="picture"
            >
              <p className="ant-upload-drag-icon">
                <PlusOutlined />
              </p>
              <p className="ant-upload-text">Haz clic o arrastra un archivo aquí</p>
              <p className="ant-upload-hint">Soporta PDF e imágenes</p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item
            name="fechaVencimiento"
            label="Fecha de vencimiento (opcional)"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Guardar
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Editar Documento"
        open={editModalState.visible}
        onCancel={() => {
          setEditModalState({ visible: false, documento: null, colaboradorId: '' });
          editForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditDocument}
        >
          <Form.Item
            name="nombre"
            label="Nombre del documento"
            rules={[{ required: true, message: 'Por favor ingresa un nombre' }]}
          >
            <input type="text" className="ant-input" />
          </Form.Item>

          <Form.Item
            name="documento"
            label="Documento (opcional)"
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
          >
            <Upload.Dragger
              name="documento"
              beforeUpload={() => false}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              maxCount={1}
              listType="picture"
            >
              <p className="ant-upload-drag-icon">
                <PlusOutlined />
              </p>
              <p className="ant-upload-text">Haz clic o arrastra un archivo aquí para reemplazarlo</p>
              <p className="ant-upload-hint">Soporta PDF e imágenes</p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item
            name="fechaVencimiento"
            label="Fecha de vencimiento (opcional)"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Actualizar
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Papeleria;

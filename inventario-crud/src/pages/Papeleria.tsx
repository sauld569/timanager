import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Collapse, Modal, Form, DatePicker, message, Upload, Tooltip } from 'antd';
import { FaUsers } from 'react-icons/fa';
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

interface EditDocumentState {
  visible: boolean;
  documento: Documento | null;
  colaboradorId: string;
}

const API_URL = import.meta.env.VITE_API_URL;


const Papeleria: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [documentos, setDocumentos] = useState<{ [key: string]: Documento[] }>({});
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
      console.log('Respuesta colaboradores:', response.data);
      if (Array.isArray(response.data)) {
        setColaboradores(response.data);
      } else {
        console.error('La respuesta no es un array:', response.data);
        setColaboradores([]);
        message.error('Error en el formato de datos de colaboradores');
      }
    } catch (error) {
      console.error('Error al cargar colaboradores:', error);
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
    // Si es un string[], tomamos el último elemento
    const colaboradorId = Array.isArray(key) ? key[key.length - 1] : key;
    if (colaboradorId && !documentos[colaboradorId]) {
      fetchDocumentos(colaboradorId);
    }
  };

  const handleAddDocument = async (values: any) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      // Verifica que el archivo existe y es el primer archivo del fileList
      if (values.documento && values.documento[0]) {
        const file = values.documento[0].originFileObj;
        formData.append('documento', file);
        console.log('Archivo seleccionado:', file);
      } else {
        console.error('Valores del formulario:', values);
        throw new Error('No se seleccionó ningún archivo');
      }

      formData.append('nombre', values.nombre);
      formData.append('colaboradorId', selectedColaborador);
      if (values.fechaVencimiento) {
        formData.append('fechaVencimiento', values.fechaVencimiento.toISOString());
      }

      console.log('FormData creado:', {
        nombre: values.nombre,
        colaboradorId: selectedColaborador,
        fechaVencimiento: values.fechaVencimiento?.toISOString()
      });

      // Agregar headers específicos para multipart/form-data
      const response = await axios.post(`${API_URL}documentos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Respuesta del servidor:', response.data);
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
      
      // Si hay un nuevo archivo
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
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
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


  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Documentos</h1>
        <button
          className="btn btn-warning d-flex align-items-center gap-2"
          onClick={() => navigate('/colaboradores')}
        >
          <FaUsers />
          Volver a Colaboradores
        </button>
      </div>
      <div style={{ marginTop: '20px' }}>
        <Collapse
          onChange={handlePanelChange}
          items={colaboradores.map(colaborador => ({
            key: colaborador._id,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src={colaborador.fotografia ? 
                    `${API_URL}colaboradores/foto/${colaborador.fotografia.split('/').pop()}` 
                    : '/test.png'
                  } 
                  alt={colaborador.nombre}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = '/test.png';
                    console.log('Error cargando imagen para:', colaborador.nombre, 'URL:', colaborador.fotografia);
                  }}
                />
                <span>ID: {colaborador.numeroEmpleado} - {colaborador.nombre}</span>
              </div>
            ),
            extra: (
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
            ),
            children: (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {documentos[colaborador._id]?.map((doc: Documento) => (
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
                            style={{ color: 'red' }}
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
                        onClick={() => {
                          console.log('Documento completo:', doc);
                          console.log('URL original:', doc.url);
                          console.log('Nombre del archivo:', doc.url.split('/').pop());
                          console.log('URL final:', `${API_URL}documentos/ver/${doc.url.split('/').pop()}`);
                        }}
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
            )
          }))}
        />
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
              console.log('Upload event:', e);
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
            rules={[{ 
              required: true, 
              message: 'Por favor selecciona un documento',
              validator: (_, value) => {
                if (!value || value.length === 0) {
                  return Promise.reject('Por favor selecciona un documento');
                }
                return Promise.resolve();
              }
            }]}
          >
            <Upload.Dragger
              name="documento"
              beforeUpload={(file) => {
                console.log('Archivo antes de subir:', file);
                return false;
              }}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
              maxCount={1}
              listType="picture"
              onRemove={(file) => {
                console.log('Archivo removido:', file);
                form.setFieldValue('documento', []);
              }}
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

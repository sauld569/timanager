import React, { useState, useMemo } from 'react';
import { Button, Modal, Table, ListGroup } from 'react-bootstrap';
import { Cotizacion } from '../../types';
import SearchBar from '../common/SearchBar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CotizacionReportModalProps {
  show: boolean;
  onHide: () => void;
  cotizaciones: Cotizacion[];
}

const CotizacionReportModal: React.FC<CotizacionReportModalProps> = ({
  show,
  onHide,
  cotizaciones
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showReport, setShowReport] = useState(false);

  // Filtrar cotizaciones para sugerencias en tiempo real
  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    const seen = new Set();
    
    // Buscar coincidencias y extraer valor relevante (cliente o número)
    return cotizaciones
      .reduce((acc: string[], cot) => {
        const clienteName = typeof cot.cliente === 'string' 
          ? cot.cliente 
          : cot.cliente.nombreEmpresa;
        
        const numero = cot.numeroPresupuesto;
        
        let match = '';
        if (clienteName?.toLowerCase().includes(term)) match = clienteName;
        else if (numero.toLowerCase().includes(term)) match = numero;
        
        if (match && !seen.has(match)) {
          seen.add(match);
          acc.push(match);
        }
        return acc;
      }, [])
      .slice(0, 5); // Limitar a 5 sugerencias
  }, [searchTerm, cotizaciones]);

  // Filtrar cotizaciones según búsqueda final
  const filteredCotizaciones = useMemo(() => {
    if (searchTerm.trim() === '') return [];
    
    const lowerTerm = searchTerm.toLowerCase();
    return cotizaciones.filter(cotizacion => {
        return (
          cotizacion.numeroPresupuesto.toLowerCase().includes(lowerTerm) ||
          (typeof cotizacion.cliente === 'string'
            ? cotizacion.cliente.toLowerCase().includes(lowerTerm)
            : cotizacion.cliente.nombreEmpresa.toLowerCase().includes(lowerTerm)) ||
          cotizacion.estado.toLowerCase().includes(lowerTerm)
        );
    });
  }, [searchTerm, cotizaciones]);

  const handleSelectSuggestion = (suggestion: string) => {
    setSearchTerm(suggestion);
    // Auto-generar reporte al seleccionar sugerencia
    setShowReport(true);
  };

  // Calcular métricas
  const cantidad = filteredCotizaciones.length;
  const montoTotal = filteredCotizaciones.reduce((sum, cot) => sum + cot.total, 0);
  const fechaMasReciente = filteredCotizaciones.length > 0
    ? new Date(Math.max(...filteredCotizaciones.map(c => new Date(c.fecha).getTime())))
    : null;

  // Generar reporte
  const handleGenerateReport = () => {
    if (filteredCotizaciones.length === 0) {
      alert('No hay cotizaciones que coincidan con la búsqueda');
      return;
    }
    setShowReport(true);
  };

  // Descargar PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(18);
    doc.text('Reporte de Cotizaciones', 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Criterio de búsqueda: ${searchTerm || 'Todos'}`, 14, 30);
    doc.text(`Fecha de reporte: ${new Date().toLocaleDateString()}`, 14, 36);

    // Resumen
    doc.setFontSize(12);
    doc.text('Resumen:', 14, 46);
    doc.setFontSize(10);
    doc.text(`Cantidad: ${cantidad}`, 14, 52);
    doc.text(`Monto Total: $${montoTotal.toFixed(2)}`, 60, 52);
    doc.text(`Última Fecha: ${fechaMasReciente ? fechaMasReciente.toLocaleDateString() : 'N/A'}`, 120, 52);

    // Tabla de datos
    const tableColumn = ["No. Presupuesto", "Cliente", "Estado", "Monto", "Fecha"];
    const tableRows: any[] = [];

    filteredCotizaciones.forEach(cot => {
      const cotData = [
        cot.numeroPresupuesto,
        typeof cot.cliente === 'string' ? cot.cliente : (cot.cliente.nombreEmpresa || 'Sin cliente'),
        cot.estado,
        `$${cot.total.toFixed(2)}`,
        new Date(cot.fecha).toLocaleDateString()
      ];
      tableRows.push(cotData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] }
    });

    // Guardar PDF
    doc.save(`Reporte_Cotizaciones_${searchTerm || 'General'}.pdf`);
  };

  const handleClose = () => {
    setShowReport(false);
    setSearchTerm('');
    onHide();
  };

  // Vista de búsqueda
  if (!showReport) {
    return (
      <Modal show={show} onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Generar Reporte de Cotizaciones</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="position-relative">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por número, cliente o estado..."
              className="mb-2"
            />
            {suggestions.length > 0 && (
              <ListGroup className="position-absolute w-100 shadow-sm" style={{ zIndex: 1000, top: '100%' }}>
                {suggestions.map((suggestion, index) => (
                  <ListGroup.Item 
                    key={index} 
                    action 
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="border-0 border-bottom"
                  >
                    {suggestion}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </div>
          <small className="text-muted d-block mt-2">
            Ingresa los criterios de búsqueda (empresa, número de presupuesto o estado) para generar el reporte.
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleGenerateReport}>
            Generar Reporte
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  // Vista de reporte
  return (
    <Modal show={show} onHide={handleClose} size="xl" className="cotizacion-report-modal">
      <Modal.Header closeButton>
        <Modal.Title>Reporte de Cotizaciones</Modal.Title>
      </Modal.Header>
      <Modal.Body id="report-content" className="report-body">
        {/* Encabezado del reporte */}
        <div className="report-header mb-4">
          <h4>Resumen de Búsqueda</h4>
          <div className="row">
            <div className="col-md-4">
              <p><strong>Cantidad de Cotizaciones:</strong> {cantidad}</p>
            </div>
            <div className="col-md-4">
              <p><strong>Monto Total Acumulado:</strong> ${montoTotal.toFixed(2)}</p>
            </div>
            <div className="col-md-4">
              <p>
                <strong>Fecha Más Reciente:</strong>{' '}
                {fechaMasReciente ? fechaMasReciente.toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          <p className="mt-2"><strong>Criterio de búsqueda:</strong> {searchTerm || 'Todos'}</p>
          <hr />
        </div>

        {/* Tabla de cotizaciones */}
        <div className="table-responsive">
          <Table striped bordered hover size="sm">
            <thead className="table-header-print">
              <tr>
                <th>No. Presupuesto</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredCotizaciones.map((cot) => (
                <tr key={cot._id}>
                  <td>{cot.numeroPresupuesto}</td>
                  <td>
                    {typeof cot.cliente === 'string'
                      ? cot.cliente
                      : cot.cliente.nombreEmpresa || 'Sin cliente'}
                  </td>
                  <td>{cot.estado}</td>
                  <td>${cot.total.toFixed(2)}</td>
                  <td>{new Date(cot.fecha).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowReport(false)}>
          Atrás
        </Button>
        <Button variant="success" onClick={handleDownloadPDF}>
          <i className="fas fa-file-pdf me-2"></i>Descargar PDF
        </Button>
        <Button variant="primary" onClick={handleClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CotizacionReportModal;

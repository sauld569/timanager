import React from 'react';
import ColaboradorList from '../components/colaboradores/ColaboradorList';

const Colaboradores: React.FC = () => {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Empleados</h2>
      </div>
      <ColaboradorList />
    </div>
  );
};

export default Colaboradores;

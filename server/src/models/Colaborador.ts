import mongoose, { Schema, Document } from 'mongoose';
import { getRazonSocialById } from '../controllers/razonSocialController';

export interface IColaborador extends Document {
  numeroEmpleado: string;
  nombre: string;
  nss: string; // Número de Seguro Social
  puesto: string;
  fotografia?: string; // URL o path a la imagen
  fechaAltaIMSS: Date;
  razonSocialId: mongoose.Types.ObjectId;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ColaboradorSchema: Schema = new Schema({
  numeroEmpleado: { 
    type: Number, 
    unique: true 
  },
  nombre: { 
    type: String, 
    required: true 
  },
  nss: { 
    type: String, 
    required: true,
    unique: true
  },
  puesto: { 
    type: String, 
    required: true 
  },
  fotografia: { 
    type: String 
  },
  fechaAltaIMSS: { 
    type: Date, 
    required: true 
  },
  razonSocialId: { 
    type: Schema.Types.ObjectId, 
    ref: 'RazonSocial',
    required: true
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Añade createdAt y updatedAt
});

// Middleware para generar número de empleado automáticamente usando un contador independiente
ColaboradorSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Counter = mongoose.model('Counter');
    
    // Obtener y actualizar el contador en una sola operación atómica
    const counter = await Counter.findOneAndUpdate(
      { _id: 'empleadoId' },
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true } // new: true retorna el documento actualizado, upsert: true lo crea si no existe
    );
    
    // Asignar el nuevo número de empleado
    this.numeroEmpleado = counter.sequence_value;
  }
  next();
});

export default mongoose.model<IColaborador>('Colaborador', ColaboradorSchema);

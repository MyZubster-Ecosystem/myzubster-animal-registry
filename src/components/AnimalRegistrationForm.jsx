import React, { useState } from 'react';

const AnimalRegistrationForm = () => {
const [formData, setFormData] = useState({
name: '',
species: '',
owner_id: ''
});

const [errors, setErrors] = useState({});
const [isSubmitting, setIsSubmitting] = useState(false);

const validate = () => {
const newErrors = {};
if (!formData.name.trim()) newErrors.name = 'Il nome è obbligatorio';
if (!formData.species.trim()) newErrors.species = 'La specie è obbligatoria';
if (!formData.owner_id.trim()) newErrors.owner_id = 'Owner ID obbligatorio';
setErrors(newErrors);
return Object.keys(newErrors).length === 0;
};

const handleChange = (e) => {
const { name, value } = e.target;
setFormData(prev => ({ ...prev, [name]: value }));
};

const handleSubmit = async (e) => {
e.preventDefault();
if (!validate()) return;
setIsSubmitting(true);
try {
await new Promise(resolve => setTimeout(resolve, 1000));
alert('Animale registrato con successo!');
} catch (error) {
console.error('Errore:', error);
} finally {
setIsSubmitting(false);
}
};

return (
<form onSubmit={handleSubmit}> <h2>Registra un nuovo animale</h2> <div> <label>Nome *</label> <input type="text" name="name" value={formData.name} onChange={handleChange} /> {errors.name && <span style={{color:'red'}}>{errors.name}</span>} </div> <div> <label>Specie *</label> <input type="text" name="species" value={formData.species} onChange={handleChange} /> {errors.species && <span style={{color:'red'}}>{errors.species}</span>} </div> <div> <label>Owner ID *</label> <input type="text" name="owner_id" value={formData.owner_id} onChange={handleChange} /> {errors.owner_id && <span style={{color:'red'}}>{errors.owner_id}</span>} </div> <button type="submit" disabled={isSubmitting}> {isSubmitting ? 'Registrando...' : 'Registra animale 🐾'} </button> </form> ); };

export default AnimalRegistrationForm;

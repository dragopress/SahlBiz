import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Employee } from '../../types';
import { formatMad } from '../../lib/moroccanTax';
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  X,
  FileText,
  UserCheck
} from 'lucide-react';

export const EmployeeModule: React.FC = () => {
  const { employees, addEmployee, updateEmployee } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<Employee | null>(null);

  const [newEmp, setNewEmp] = useState({
    name: '',
    role: 'Vendeur',
    cin: '',
    cnssNumber: '',
    phone: '',
    baseSalary: 3500,
  });

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.cin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    addEmployee(newEmp);
    setIsAddModalOpen(false);
    setNewEmp({
      name: '',
      role: 'Vendeur',
      cin: '',
      cnssNumber: '',
      phone: '',
      baseSalary: 3500,
    });
  };

  const handleToggleAttendance = (emp: Employee) => {
    updateEmployee({
      ...emp,
      attendanceToday: !emp.attendanceToday,
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-emerald-400" />
            <span>Employés, Pointage & Fiche de Paie CNSS</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pointage quotidien, immatriculation CNSS / AMO et génération des bulletins de paie conformes au Code du Travail.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-900/30 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Salarié</span>
        </button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase block mb-1">Masse Salariale Mensuelle</span>
          <div className="text-2xl font-bold text-white">
            {formatMad(employees.reduce((sum, e) => sum + e.baseSalary, 0))}
          </div>
          <span className="text-xs text-slate-400 block mt-1">
            {employees.length} salariés déclarés SahlBiz
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase block mb-1">Présence Aujourd'hui</span>
          <div className="text-2xl font-bold text-emerald-400">
            {employees.filter(e => e.attendanceToday).length} / {employees.length}
          </div>
          <span className="text-xs text-slate-400 block mt-1">
            Pointage temps réel
          </span>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Salarié & CIN</th>
                <th className="p-3.5">Poste & N° CNSS</th>
                <th className="p-3.5 text-center">Pointage du Jour</th>
                <th className="p-3.5 text-right">Salaire Base (MAD)</th>
                <th className="p-3.5 text-center">Bulletin de Paie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-white text-xs sm:text-sm">{emp.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">CIN: {emp.cin}</div>
                  </td>

                  <td className="p-3.5">
                    <div className="font-medium text-slate-200">{emp.role}</div>
                    <div className="text-[10px] text-emerald-400 font-mono">CNSS: {emp.cnssNumber}</div>
                  </td>

                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleToggleAttendance(emp)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors flex items-center gap-1 mx-auto ${
                        emp.attendanceToday
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>{emp.attendanceToday ? 'PRÉSENT' : 'ABSENT'}</span>
                    </button>
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold text-white text-sm">
                    {formatMad(emp.baseSalary)}
                  </td>

                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setSelectedPayslipEmp(emp)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Fiche de Paie</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fiche de Paie Modal */}
      {selectedPayslipEmp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-900 uppercase">Bulletin de Paie Simplifié</h3>
                <p className="text-xs text-slate-500">Période: {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
              </div>
              <button onClick={() => setSelectedPayslipEmp(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="font-bold text-slate-900">{selectedPayslipEmp.name}</div>
                <div className="text-slate-600">Poste: {selectedPayslipEmp.role}</div>
                <div className="font-mono text-[11px] text-slate-700">CIN: {selectedPayslipEmp.cin}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-emerald-800 font-bold">CNSS N°: {selectedPayslipEmp.cnssNumber}</div>
                <div className="text-slate-600">Jours travaillés: 26 jours</div>
              </div>
            </div>

            {/* Payslip Calculations */}
            <div className="space-y-2 text-xs font-mono border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="flex justify-between">
                <span>Salaire Brut de Base:</span>
                <span className="font-bold">{formatMad(selectedPayslipEmp.baseSalary)}</span>
              </div>
              <div className="flex justify-between text-red-600 text-[11px]">
                <span>- Cotisation CNSS Salarié (3.96%):</span>
                <span>-{formatMad(selectedPayslipEmp.baseSalary * 0.0396)}</span>
              </div>
              <div className="flex justify-between text-red-600 text-[11px]">
                <span>- AMO Salarié (2.26%):</span>
                <span>-{formatMad(selectedPayslipEmp.baseSalary * 0.0226)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-sm text-slate-900">
                <span>NET À PAYER SALARIÉ:</span>
                <span className="text-emerald-700">
                  {formatMad(selectedPayslipEmp.baseSalary * (1 - 0.0396 - 0.0226))}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-slate-500 italic">Conforme au Code du Travail Marocain</span>
              <button
                onClick={() => window.print()}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Nouveau Salarié</h3>
              <button onClick={() => setIsAddModalOpen(false)}><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Khalid Saidi"
                  value={newEmp.name}
                  onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Poste / Rôle</label>
                  <input
                    type="text"
                    value={newEmp.role}
                    onChange={e => setNewEmp({ ...newEmp, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">N° CIN *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: AB123456"
                    value={newEmp.cin}
                    onChange={e => setNewEmp({ ...newEmp, cin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">N° Immatriculation CNSS</label>
                  <input
                    type="text"
                    placeholder="ex: 198273645"
                    value={newEmp.cnssNumber}
                    onChange={e => setNewEmp({ ...newEmp, cnssNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Salaire Base Mensuel (MAD)</label>
                  <input
                    type="number"
                    value={newEmp.baseSalary}
                    onChange={e => setNewEmp({ ...newEmp, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-3 py-2 bg-slate-800 rounded-xl">Annuler</button>
                <button type="submit" className="px-3 py-2 bg-emerald-600 font-bold rounded-xl">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

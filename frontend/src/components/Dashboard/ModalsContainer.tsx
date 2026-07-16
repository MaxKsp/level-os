import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'motion/react';

export const ModalsContainer: React.FC = () => {
  const {
    tasks,
    exercises,
    handleToggleTask,
    handleToggleExercise,
    
    // Search
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    
    // Modal open states
    isTaskModalOpen,
    setIsTaskModalOpen,
    isExpenseModalOpen,
    setIsExpenseModalOpen,
    isWeightModalOpen,
    setIsWeightModalOpen,
    isWorkoutModalOpen,
    setIsWorkoutModalOpen,
    
    // Form fields
    newTaskTitle,
    setNewTaskTitle,
    newTaskTime,
    setNewTaskTime,
    newTaskSubtitle,
    setNewTaskSubtitle,
    
    expenseDesc,
    setExpenseDesc,
    expenseAmount,
    setExpenseAmount,
    expenseType,
    setExpenseType,
    
    weightValue,
    setWeightValue,
    
    workoutTimer,
    setWorkoutTimer,
    isWorkoutActive,
    setIsWorkoutActive,
    
    // Submissions
    handleAddTaskSubmit,
    handleAddExpenseSubmit,
    handleAddWeightSubmit,
  } = useApp();

  // Keyboard shortcut '/' for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Exercise completed counts
  const completedExercisesCount = exercises.filter((ex) => ex.completed).length;
  const totalExercisesCount = exercises.length;

  return (
    <>
      {/* 1. GLOBAL SEARCH OVERLAY */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 pt-24">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-[#101415] border border-[#24242D] rounded-2xl shadow-2xl p-4 overflow-hidden z-10"
            >
              <div className="flex items-center gap-3 px-3 py-2 border-b border-[#24242D] mb-4">
                <span className="material-symbols-outlined text-primary text-[24px]">search</span>
                <input
                  type="text"
                  autoFocus
                  placeholder="Busca global... (digite tarefas ou treinos)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsSearchOpen(false);
                  }}
                  className="w-full bg-transparent border-none text-[#e0e3e5] placeholder-[#8c909f] focus:outline-none font-sans text-base focus:ring-0"
                />
                <Button variant="secondary" size="sm" onClick={() => setIsSearchOpen(false)} className="h-7 text-[10px] px-2">
                  ESC
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto px-2 pb-2 space-y-4">
                {searchQuery.trim() === '' ? (
                  <div className="text-center py-12 text-[#8c909f] font-sans text-xs">
                    Digite algo para iniciar a busca no ecossistema Orby...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Filter Tasks */}
                    {tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <h4 className="text-primary text-[10px] font-bold uppercase tracking-wider pl-1 mb-1">Tarefas Encontradas</h4>
                        <div className="space-y-1">
                          {tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).map(t => (
                            <div
                              key={t.id}
                              onClick={() => {
                                handleToggleTask(t.id);
                                setIsSearchOpen(false);
                              }}
                              className="flex justify-between items-center bg-[#131318] hover:bg-white/5 p-3 rounded-xl cursor-pointer border border-[#24242D] transition-colors"
                            >
                              <span className={`font-sans text-xs ${t.completed ? 'line-through text-[#8c909f]' : 'text-[#e0e3e5]'}`}>{t.title}</span>
                              <span className="font-mono text-xs text-primary">{t.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Filter Exercises */}
                    {exercises.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <h4 className="text-secondary text-[10px] font-bold uppercase tracking-wider pl-1 mb-1">Exercícios do Treino</h4>
                        <div className="space-y-1">
                          {exercises.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())).map(e => (
                            <div
                              key={e.id}
                              onClick={() => {
                                handleToggleExercise(e.id);
                                setIsSearchOpen(false);
                              }}
                              className="flex justify-between items-center bg-[#131318] hover:bg-white/5 p-3 rounded-xl cursor-pointer border border-[#24242D] transition-colors"
                            >
                              <span className={`font-sans text-xs ${e.completed ? 'line-through text-[#8c909f]' : 'text-[#e0e3e5]'}`}>{e.name}</span>
                              <span className="font-sans text-[10px] text-[#8c909f]">{e.sets}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
                     exercises.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <div className="text-center py-8 text-[#8c909f] font-sans text-xs">
                        Nenhum resultado encontrado para "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. MODAL NOVA TAREFA */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Nova Tarefa da Rotina"
        icon="add_circle"
      >
        <form onSubmit={handleAddTaskSubmit} className="space-y-4">
          <Input
            label="Título da Tarefa"
            type="text"
            required
            placeholder="Ex: Reunião Diária de Alinhamento"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Horário"
              type="time"
              required
              value={newTaskTime}
              onChange={(e) => setNewTaskTime(e.target.value)}
            />
            <Input
              label="Marcador / Tag"
              type="text"
              placeholder="Ex: GitHub, Equipe, Casa"
              value={newTaskSubtitle}
              onChange={(e) => setNewTaskSubtitle(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#24242D] mt-4">
            <Button type="button" variant="ghost" onClick={() => setIsTaskModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Tarefa
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. MODAL LANÇAR DESPESA */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Lançar Nova Despesa"
        icon="payments"
      >
        <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
          <Input
            label="Descrição"
            type="text"
            required
            placeholder="Ex: Assinatura Copilot, Almoço comercial"
            value={expenseDesc}
            onChange={(e) => setExpenseDesc(e.target.value)}
          />

          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            required
            placeholder="0,00"
            fontFamily="mono"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
          />

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold font-sans text-[#8c909f] uppercase tracking-wider">Tipo de Despesa</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExpenseType('invoice')}
                className={`p-3 rounded-lg border font-sans text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                  expenseType === 'invoice'
                    ? 'bg-red-500/10 border-red-500/50 text-[#ffb4ab]'
                    : 'bg-[#131318] border-[#24242D] text-[#8c909f] hover:border-[#8c909f]/30'
                }`}
              >
                Fatura de Crédito
              </button>
              <button
                type="button"
                onClick={() => setExpenseType('sub_balance')}
                className={`p-3 rounded-lg border font-sans text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                  expenseType === 'sub_balance'
                    ? 'bg-primary/10 border-primary/50 text-primary'
                    : 'bg-[#131318] border-[#24242D] text-[#8c909f] hover:border-[#8c909f]/30'
                }`}
              >
                Subtrair do Saldo
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#24242D] mt-4">
            <Button type="button" variant="ghost" onClick={() => setIsExpenseModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Lançar Despesa
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. MODAL REGISTRAR PESO */}
      <Modal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        title="Registrar Peso Diário"
        icon="monitor_weight"
      >
        <form onSubmit={handleAddWeightSubmit} className="space-y-4">
          <div className="flex flex-col gap-2 items-center py-4 text-center">
            <p className="font-mono text-4xl font-bold text-primary">{weightValue} <span className="text-sm">kg</span></p>
            <p className="text-[11px] text-[#8c909f] font-sans">Meta de Definição: 78.0 kg</p>
            
            <input
              type="range"
              min="65"
              max="100"
              step="0.1"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              className="w-full h-1.5 bg-[#191c1e] rounded-lg appearance-none cursor-pointer accent-primary mt-4"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#24242D] mt-4">
            <Button type="button" variant="ghost" onClick={() => setIsWeightModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Registro
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. MODAL TREINO ATIVO */}
      <Modal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        title="Treino do Dia: Superior A"
        icon="fitness_center"
        maxWidth="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          {/* Header Info */}
          <div className="flex justify-between items-center pb-2 border-b border-[#24242D]">
            <div className="font-sans text-xs text-[#8c909f]">Peito e Tríceps — Hipertrofia</div>
            <div className="bg-[#131318] border border-[#24242D] px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-mono text-primary">
              <span className="material-symbols-outlined text-[16px] animate-pulse">timer</span>
              <span>{formatSeconds(workoutTimer)}</span>
            </div>
          </div>

          {/* Interactive controls */}
          <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between">
            <span className="font-sans text-[11px] text-[#e0e3e5] font-bold uppercase tracking-wider">Cronômetro de Atividade</span>
            <Button
              type="button"
              variant={isWorkoutActive ? 'danger' : 'primary'}
              size="sm"
              onClick={() => setIsWorkoutActive(!isWorkoutActive)}
              className="h-8 py-1.5"
            >
              {isWorkoutActive ? 'Pausar Atividade' : 'Retomar Atividade'}
            </Button>
          </div>

          {/* Exercise List */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                onClick={() => handleToggleExercise(ex.id)}
                className="flex justify-between items-center p-3.5 bg-[#131318] hover:bg-white/5 border border-[#24242D] rounded-xl cursor-pointer transition-all duration-200"
              >
                <div>
                  <p className={`font-sans font-bold text-xs ${ex.completed ? 'line-through text-[#8c909f]/60' : 'text-[#e0e3e5]'}`}>{ex.name}</p>
                  <p className="font-sans text-[10px] text-[#8c909f] mt-0.5">{ex.sets}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-primary">
                    {ex.completed ? 'Concluído' : 'Pendente'}
                  </span>
                  <div className="w-5 h-5 rounded-full border border-[#424753] flex items-center justify-center transition-colors">
                    {ex.completed && <span className="material-symbols-outlined text-primary text-xs font-bold">check</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer controls */}
          <div className="flex justify-between items-center pt-3 border-t border-[#24242D] mt-2">
            <span className="text-[10px] text-[#8c909f] font-sans font-bold uppercase tracking-wider">
              Progresso: {completedExercisesCount} de {totalExercisesCount}
            </span>
            <Button
              onClick={() => {
                // Complete all exercises
                setIsWorkoutActive(false);
                setIsWorkoutModalOpen(false);
                alert("Parabéns, Lucas! Treino Superior A: Peito e Tríceps concluído com sucesso!");
              }}
            >
              Concluir Treino
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

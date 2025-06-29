import React, { useState, useEffect, useCallback } from 'react';

import { Child, Category, WeeklyArchive } from './types';
import { 
    REWARD_TIER_1_CHORES, 
    REWARD_TIER_2_CHORES,
    REWARD_TIER_1_CASH,
    REWARD_TIER_2_CASH,
    REWARD_TIER_1_CATEGORIES,
    REWARD_TIER_2_CATEGORIES 
} from './constants';
import ChildLane from './components/ChildLane';
import Confetti from './components/Confetti';
import AddCategoryForm from './components/AddCategoryForm';
import ReminderBanner from './components/ReminderBanner';
import AvatarPickerModal from './components/AvatarPickerModal';
import { PlusIcon, ResetIcon, TrophyIcon } from './components/icons';
import RewardToast from './components/RewardToast';
import { WeeklySummaryModal } from './components/WeeklySummaryModal';
import ConfirmationModal from './components/ConfirmationModal';

const INITIAL_CHILDREN: Child[] = [
  { id: 'child1', name: 'Léa', avatarId: 'avatar1', chores: {}, totalEarnings: 5, archive: [] },
  { id: 'child2', name: 'Tom', avatarId: 'avatar2', chores: {}, totalEarnings: 12, archive: [] },
  { id: 'child3', name: 'Mia', avatarId: 'avatar3', chores: {}, totalEarnings: 8.5, archive: [] },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Mettre la table' },
  { id: 'cat2', name: 'Ranger sa chambre' },
  { id: 'cat3', name: 'Faire ses devoirs' },
];


export const calculateWeeklyEarnings = (chores: Record<string, number>): number => {
    const totalChores = Object.values(chores).reduce((sum: number, count: number) => sum + count, 0);
    const distinctCategories = Object.keys(chores).filter(catId => chores[catId] > 0).length;

    if (totalChores >= REWARD_TIER_2_CHORES && distinctCategories >= REWARD_TIER_2_CATEGORIES) {
        return REWARD_TIER_2_CASH;
    }
    if (totalChores >= REWARD_TIER_1_CHORES && distinctCategories >= REWARD_TIER_1_CATEGORIES) {
        return REWARD_TIER_1_CASH;
    }
    return 0;
};


const App: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFiringConfetti, setIsFiringConfetti] = useState(false);
  const [rewardToast, setRewardToast] = useState<{ amount: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAvatarForChild, setEditingAvatarForChild] = useState<Child | null>(null);
  
  // State machine for archiving flow
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<Category | null>(null);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      const storedChildren = localStorage.getItem('familyChores_children');
      const storedCategories = localStorage.getItem('familyChores_categories');

      if (storedChildren) {
        setChildren(JSON.parse(storedChildren));
      } else {
        setChildren(INITIAL_CHILDREN);
      }

      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      } else {
        setCategories(INITIAL_CATEGORIES);
      }
    } catch (error) {
      console.error("Failed to parse localStorage data:", error);
      setChildren(INITIAL_CHILDREN);
      setCategories(INITIAL_CATEGORIES);
    }
    setIsLoading(false); 
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('familyChores_children', JSON.stringify(children));
      localStorage.setItem('familyChores_categories', JSON.stringify(categories));
    }
  }, [children, categories, isLoading]);

  const handleMarkChore = useCallback((childId: string, categoryId: string) => {
    const child = children.find(c => c.id === childId);
    if (!child) return;

    const oldEarnings = calculateWeeklyEarnings(child.chores);
    const newChores = {
      ...child.chores,
      [categoryId]: (child.chores[categoryId] || 0) + 1,
    };
    const newEarnings = calculateWeeklyEarnings(newChores);

    if (newEarnings > oldEarnings) {
      setIsFiringConfetti(true);
      setRewardToast({ amount: newEarnings });
      setTimeout(() => {
          setIsFiringConfetti(false);
          setRewardToast(null);
      }, 3500);
    }
    
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, chores: newChores } : c));
  }, [children]);
  
  const handleUnmarkChore = useCallback((childId: string, categoryId: string) => {
    setChildren(prev => prev.map(c => {
      if (c.id === childId && (c.chores[categoryId] || 0) > 0) {
        const newChores = { ...c.chores };
        newChores[categoryId] -= 1;
        if (newChores[categoryId] === 0) {
            delete newChores[categoryId];
        }
        return { ...c, chores: newChores };
      }
      return c;
    }));
  }, []);

  const handleUpdateName = (childId: string, newName: string) => {
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, name: newName } : c));
  };
  
  const handleUpdateEarnings = (childId: string, newAmount: number) => {
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, totalEarnings: newAmount } : c));
  };

  const handleAddCategory = (name: string) => {
    const newCategory: Category = {
      id: `cat_${new Date().getTime()}`,
      name,
    };
    setCategories(prev => [...prev, newCategory]);
  };
  
  const handleDeleteCategoryRequest = useCallback((categoryId: string) => {
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (categoryToDelete) {
        setIsConfirmingDelete(categoryToDelete);
    }
  }, [categories]);

  const handleConfirmDeleteCategory = () => {
    if (!isConfirmingDelete) return;
    const categoryIdToDelete = isConfirmingDelete.id;

    setCategories(prev => prev.filter(c => c.id !== categoryIdToDelete));
    
    setChildren(prev => prev.map(child => {
      const newChores = { ...child.chores };
      if (newChores[categoryIdToDelete]) {
        delete newChores[categoryIdToDelete];
      }
      return { ...child, chores: newChores };
    }));
    
    setIsConfirmingDelete(null);
  };

  const handleSelectAvatar = (childId: string, avatarId: string) => {
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, avatarId } : c));
    setEditingAvatarForChild(null);
  };

  const handleArchiveWeek = () => {
    setIsConfirmingArchive(true);
  };

  const handleConfirmArchive = () => {
    setIsConfirmingArchive(false);
    setShowWeeklySummary(true);
  };

  const finalizeWeekAndCloseSummary = () => {
    setShowWeeklySummary(false);
    setIsResetting(true);

    const updatedChildren = children.map(child => {
        const weeklyEarnings = calculateWeeklyEarnings(child.chores);
        const totalChores = Object.values(child.chores).reduce((sum, count) => sum + count, 0);
        const currentTotal = Number(child.totalEarnings) || 0;
        const newTotalEarnings = currentTotal + weeklyEarnings;
        
        const newArchiveEntry: WeeklyArchive | null = totalChores > 0 ? {
            weekOf: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
            totalChores,
            earnings: weeklyEarnings,
        } : null;

        const newArchive = newArchiveEntry ? [newArchiveEntry, ...(child.archive || [])] : (child.archive || []);
        
        return {
          ...child,
          chores: {},
          totalEarnings: newTotalEarnings,
          archive: newArchive
        };
    });

    setChildren(updatedChildren);
    
    setTimeout(() => {
        setIsResetting(false);
    }, 500);
  };
  
  const openAvatarPicker = (childId: string) => {
    const childToEdit = children.find(c => c.id === childId);
    if (childToEdit) {
        setEditingAvatarForChild(childToEdit);
    }
  }

  const isArchiving = isConfirmingArchive || showWeeklySummary || isResetting || !!isConfirmingDelete;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <Confetti isFiring={isFiringConfetti} />
      <RewardToast reward={rewardToast} />
      {isModalOpen && <AddCategoryForm onAddCategory={handleAddCategory} onClose={() => setIsModalOpen(false)} />}
      {editingAvatarForChild && (
        <AvatarPickerModal 
            onClose={() => setEditingAvatarForChild(null)}
            currentAvatarId={editingAvatarForChild.avatarId}
            onSelectAvatar={(avatarId) => handleSelectAvatar(editingAvatarForChild.id, avatarId)}
        />
      )}
      <ConfirmationModal
        isOpen={isConfirmingArchive}
        onClose={() => setIsConfirmingArchive(false)}
        onConfirm={handleConfirmArchive}
        title="Archiver la semaine ?"
        message="Cette action va calculer les gains, les ajouter au total, et préparer une nouvelle semaine."
      />
      <ConfirmationModal
        isOpen={!!isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(null)}
        onConfirm={handleConfirmDeleteCategory}
        title={`Supprimer "${isConfirmingDelete?.name}" ?`}
        message="Cette action est irréversible et supprimera la tâche pour tous les enfants."
        confirmText="Oui, Supprimer"
      />
      {showWeeklySummary && (
        <WeeklySummaryModal
          children={children}
          onComplete={finalizeWeekAndCloseSummary}
        />
      )}
      
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center">
            <TrophyIcon />
            <h1 className="text-4xl font-bold text-slate-800">Tableau de Tâches</h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleArchiveWeek}
              disabled={isArchiving || isLoading}
              className="flex items-center px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg shadow hover:bg-amber-600 transition-colors disabled:bg-amber-300 disabled:cursor-wait"
            >
              <ResetIcon />
              Archiver la semaine
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={isArchiving || isLoading}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              <PlusIcon />
              Nouvelle Tâche
            </button>
          </div>
        </header>

        <ReminderBanner children={children} />
        
        {isLoading ? (
            <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-slate-600">Chargement des données...</p>
            </div>
        ) : (
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 transition-opacity duration-500 ${isResetting ? 'opacity-0' : 'opacity-100'}`}>
              {children.map(child => (
                <ChildLane
                  key={child.id}
                  child={child}
                  categories={categories}
                  onMarkChore={handleMarkChore}
                  onUnmarkChore={handleUnmarkChore}
                  onUpdateName={handleUpdateName}
                  onUpdateEarnings={handleUpdateEarnings}
                  onOpenAvatarPicker={openAvatarPicker}
                  onDeleteCategory={handleDeleteCategoryRequest}
                />
              ))}
            </div>
        )}

        <footer className="text-center text-slate-500 mt-12">
            <p>Cliquez sur l'avatar, le nom, ou le total d'argent pour modifier.</p>
            <p>Application de suivi des tâches conçue avec amour.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
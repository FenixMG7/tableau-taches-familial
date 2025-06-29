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
  const [isFiringConfetti, setIsFiringConfetti] = useState(false);
  const [rewardToast, setRewardToast] = useState<{ amount: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAvatarForChild, setEditingAvatarForChild] = useState<Child | null>(null);
  
  // State machine for archiving flow
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    try {
      const savedChildren = localStorage.getItem('choreChildren');
      const savedCategories = localStorage.getItem('choreCategories');
      
      const defaultChildren: Child[] = [
        { id: 'child1', name: 'Enfant 1', avatarId: 'avatar1', chores: {}, totalEarnings: 0, archive: [] },
        { id: 'child2', name: 'Enfant 2', avatarId: 'avatar2', chores: {}, totalEarnings: 0, archive: [] },
        { id: 'child3', name: 'Enfant 3', avatarId: 'avatar3', chores: {}, totalEarnings: 0, archive: [] },
      ];

      if (savedChildren) {
        const parsedChildren: any[] = JSON.parse(savedChildren);
        const sanitizedChildren: Child[] = parsedChildren.map((child, index) => {
            const totalEarnings = Number(child.totalEarnings);
            return {
                id: child.id || `child-${Date.now()}-${index}`,
                name: child.name || `Enfant ${index + 1}`,
                chores: child.chores || {},
                totalEarnings: isNaN(totalEarnings) ? 0 : totalEarnings,
                avatarId: child.avatarId || `avatar${(index % 6) + 1}`,
                archive: Array.isArray(child.archive) ? child.archive : [],
            };
        });
        setChildren(sanitizedChildren);
      } else {
        setChildren(defaultChildren);
      }

      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      } else {
        setCategories([
            {id: 'cat1', name: 'Mettre la table'},
            {id: 'cat2', name: 'Débarrasser la table'},
            {id: 'cat3', name: 'Ranger sa chambre'}
        ]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données depuis localStorage, réinitialisation aux valeurs par défaut.", error);
       const defaultChildren: Child[] = [
        { id: 'child1', name: 'Enfant 1', avatarId: 'avatar1', chores: {}, totalEarnings: 0, archive: [] },
        { id: 'child2', name: 'Enfant 2', avatarId: 'avatar2', chores: {}, totalEarnings: 0, archive: [] },
        { id: 'child3', name: 'Enfant 3', avatarId: 'avatar3', chores: {}, totalEarnings: 0, archive: [] },
      ];
      setChildren(defaultChildren);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('choreChildren', JSON.stringify(children));
      localStorage.setItem('choreCategories', JSON.stringify(categories));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des données dans localStorage", error);
    }
  }, [children, categories]);

  const handleMarkChore = useCallback((childId: string, categoryId: string) => {
    setChildren(prevChildren => {
      return prevChildren.map(child => {
        if (child.id === childId) {
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
          
          return { ...child, chores: newChores };
        }
        return child;
      });
    });
  }, []);
  
  const handleUnmarkChore = useCallback((childId: string, categoryId: string) => {
    setChildren(prevChildren => prevChildren.map(child => {
        if (child.id === childId && (child.chores[categoryId] || 0) > 0) {
            const newChores = {
                ...child.chores,
                [categoryId]: child.chores[categoryId] - 1,
            };
            if (newChores[categoryId] === 0) {
                delete newChores[categoryId];
            }
            return { ...child, chores: newChores };
        }
        return child;
    }));
  }, []);

  const handleUpdateName = (childId: string, newName: string) => {
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, name: newName } : c));
  };
  
  const handleUpdateEarnings = (childId: string, newAmount: number) => {
    setChildren(prev => prev.map(c => c.id === childId ? { ...c, totalEarnings: newAmount } : c));
  };

  const handleAddCategory = (name: string) => {
    const newCategory: Category = { id: `cat-${Date.now()}`, name };
    setCategories(prev => [...prev, newCategory]);
  };
  
  const handleDeleteCategory = useCallback((categoryId: string) => {
    const categoryToDelete = categories.find(c => c.id === categoryId);
    if (!categoryToDelete) return;

    const isConfirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la tâche "${categoryToDelete.name}" ?\n\nCette action est irréversible et la supprimera pour tous les enfants.`
    );

    if (isConfirmed) {
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        setChildren(prev => prev.map(child => {
            const newChores = { ...child.chores };
            delete newChores[categoryId];
            return { ...child, chores: newChores };
        }));
    }
  }, [categories]);

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
    // 1. Start fade-out animation and close summary modal
    setShowWeeklySummary(false);
    setIsResetting(true);

    // 2. Wait for animation, then update data and fade back in
    setTimeout(() => {
      setChildren(currentChildren => 
        currentChildren.map(child => {
          const weeklyEarnings = calculateWeeklyEarnings(child.chores);
          const totalChores = Object.values(child.chores).reduce((sum, count) => sum + count, 0);
          const currentTotal = Number(child.totalEarnings) || 0;
          const newTotalEarnings = currentTotal + weeklyEarnings;
          
          const newArchiveEntry: WeeklyArchive | null = totalChores > 0 ? {
              weekOf: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
              totalChores,
              earnings: weeklyEarnings,
          } : null;

          const newArchive = newArchiveEntry 
              ? [newArchiveEntry, ...(child.archive || [])] 
              : (child.archive || []);

          return {
            ...child,
            chores: {},
            totalEarnings: newTotalEarnings,
            archive: newArchive,
          };
        })
      );
      // 3. End animation
      setIsResetting(false);
    }, 500); // Must match CSS transition duration
  };
  
  const openAvatarPicker = (childId: string) => {
    const childToEdit = children.find(c => c.id === childId);
    if (childToEdit) {
        setEditingAvatarForChild(childToEdit);
    }
  }

  const isArchiving = isConfirmingArchive || showWeeklySummary || isResetting;

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
              disabled={isArchiving}
              className="flex items-center px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg shadow hover:bg-amber-600 transition-colors disabled:bg-amber-300 disabled:cursor-wait"
            >
              <ResetIcon />
              Archiver la semaine
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={isArchiving}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              <PlusIcon />
              Nouvelle Tâche
            </button>
          </div>
        </header>

        <ReminderBanner children={children} />

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
              onDeleteCategory={handleDeleteCategory}
            />
          ))}
        </div>

        <footer className="text-center text-slate-500 mt-12">
            <p>Cliquez sur l'avatar, le nom, ou le total d'argent pour modifier.</p>
            <p>Application de suivi des tâches conçue avec amour.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
// Service to import workout data from 训记 App (Training Log App)
import { WorkoutLog, WorkoutExercise } from '../context/UserContext';

export interface XunjiWorkoutData {
  date: string; // YYYY-MM-DD
  bodyParts: string[]; // e.g. ['shoulders', 'triceps']
  totalWeight: number; // kg
  totalDuration: number; // minutes
  exercises: {
    name: string;
    sets: {
      weight: number; // kg (can be per side for dumbbells)
      reps: number;
      isWarmup?: boolean;
    }[];
  }[];
}

/**
 * Parse workout data from 训记 App export format
 * Supports text parsing from QR code or manual input
 */
export const parseXunjiWorkout = (text: string): XunjiWorkoutData | null => {
  try {
    // Try JSON first (if exported as JSON)
    if (text.trim().startsWith('{')) {
      const data = JSON.parse(text);
      return {
        date: data.date || new Date().toISOString().split('T')[0],
        bodyParts: data.bodyParts || [],
        totalWeight: data.totalWeight || 0,
        totalDuration: data.totalDuration || 0,
        exercises: data.exercises || []
      };
    }

    // Parse from text format (like the image shows)
    // Format: "2025-12-21 周日\n肩+三頭\n...exercises..."
    const lines = text.split('\n').filter(l => l.trim());
    
    // Extract date (first line with date pattern)
    let date = new Date().toISOString().split('T')[0];
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
    }

    // Extract body parts (look for Chinese body part names)
    const bodyPartsMap: Record<string, string> = {
      '肩': 'shoulders',
      '三頭': 'triceps',
      '二頭': 'biceps',
      '胸': 'chest',
      '背': 'back',
      '腿': 'legs',
      '股四': 'quadriceps',
      '胭绳': 'hamstrings',
      '小腿': 'calves',
      '腹部': 'abs',
      '斜方': 'traps',
      '小臂': 'forearms'
    };

    const bodyParts: string[] = [];
    const bodyPartLine = lines.find(l => /[肩胸背腿腹二三四頭股胭小斜]/.test(l));
    if (bodyPartLine) {
      Object.keys(bodyPartsMap).forEach(key => {
        if (bodyPartLine.includes(key)) {
          bodyParts.push(bodyPartsMap[key]);
        }
      });
    }

    // Extract exercises (lines with exercise names and sets)
    const exercises: XunjiWorkoutData['exercises'] = [];
    let currentExercise: XunjiWorkoutData['exercises'][0] | null = null;

    for (const line of lines) {
      // Check if line is an exercise name (contains Chinese exercise keywords)
      if (/[哑铃器械绳索窄距推举平举卧推屈伸拉]/.test(line) && !line.includes('kg') && !line.includes('×')) {
        if (currentExercise) {
          exercises.push(currentExercise);
        }
        currentExercise = {
          name: line.trim(),
          sets: []
        };
      } else if (currentExercise && /kg|×/.test(line)) {
        // Parse set: "22.5+22.5kg × 10" or "43kg × 5"
        const setMatch = line.match(/(?:热|Set\s*\d+)?\s*(?:\(([\d.]+)\+([\d.]+)\)|([\d.]+))kg\s*×\s*(\d+)/);
        if (setMatch) {
          const isWarmup = line.includes('热') || line.includes('Warm');
          if (setMatch[1] && setMatch[2]) {
            // Dumbbell: weight per side
            const weightPerSide = parseFloat(setMatch[1]);
            currentExercise.sets.push({
              weight: weightPerSide * 2, // Total weight
              reps: parseInt(setMatch[4]),
              isWarmup
            });
          } else if (setMatch[3]) {
            // Single weight
            currentExercise.sets.push({
              weight: parseFloat(setMatch[3]),
              reps: parseInt(setMatch[4]),
              isWarmup
            });
          }
        }
      }
    }

    if (currentExercise) {
      exercises.push(currentExercise);
    }

    // Calculate total weight and duration (estimate)
    const totalWeight = exercises.reduce((sum, ex) => 
      sum + ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0), 0
    );

    return {
      date,
      bodyParts: bodyParts.length > 0 ? bodyParts : ['full_body'],
      totalWeight,
      totalDuration: 0, // Will need to be provided or estimated
      exercises
    };
  } catch (error) {
    console.error('Failed to parse workout data:', error);
    return null;
  }
};

/**
 * Convert Xunji workout data to WorkoutLog format
 */
export const convertToWorkoutLog = (data: XunjiWorkoutData): Omit<WorkoutLog, 'id' | 'timestamp'> => {
  const exercises: WorkoutExercise[] = data.exercises.map((ex, idx) => ({
    id: `${Date.now()}-${idx}`,
    name: ex.name,
    equipmentType: 'free_weight', // Default, can be improved
    targetMuscles: [], // Can be inferred from exercise name
    sets: ex.sets.length,
    reps: Math.round(ex.sets.reduce((sum, s) => sum + s.reps, 0) / ex.sets.length), // Average reps
    weight: Math.round(ex.sets.reduce((sum, s) => sum + s.weight, 0) / ex.sets.length), // Average weight
    restTime: 60, // Default 60 seconds
    notes: '',
    timestamp: Date.now()
  }));

  return {
    date: data.date,
    bodyParts: data.bodyParts,
    duration: data.totalDuration,
    exercises
  };
};






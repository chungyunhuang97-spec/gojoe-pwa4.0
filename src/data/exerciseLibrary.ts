
export type BodyPartKey = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'other';

export interface ExerciseDef {
  id: string;
  name: string;
  equipmentType: 'machine' | 'dumbbell' | 'barbell' | 'bodyweight';
  targetMuscles: string[];
  bodyPart: BodyPartKey;
  description?: string;
}

export interface WorkoutTemplateExercise {
  exerciseId: string;
  defaultSets: number;
  defaultReps: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  bodyParts: BodyPartKey[];
  exercises: WorkoutTemplateExercise[];
}

export const EXERCISE_LIBRARY: ExerciseDef[] = [
  // Chest
  { id: 'bp_bb', name: '槓鈴臥推 (Barbell Bench Press)', equipmentType: 'barbell', targetMuscles: ['chest', 'triceps'], bodyPart: 'chest' },
  { id: 'bp_db', name: '啞鈴臥推 (Dumbbell Bench Press)', equipmentType: 'dumbbell', targetMuscles: ['chest', 'triceps'], bodyPart: 'chest' },
  { id: 'pushup', name: '伏地挺身 (Push Up)', equipmentType: 'bodyweight', targetMuscles: ['chest', 'core'], bodyPart: 'chest' },
  { id: 'fly_machine', name: '蝴蝶機夾胸 (Pec Fly)', equipmentType: 'machine', targetMuscles: ['chest'], bodyPart: 'chest' },
  
  // Back
  { id: 'pullup', name: '引體向上 (Pull Up)', equipmentType: 'bodyweight', targetMuscles: ['back', 'biceps'], bodyPart: 'back' },
  { id: 'row_bb', name: '槓鈴划船 (Barbell Row)', equipmentType: 'barbell', targetMuscles: ['back', 'biceps'], bodyPart: 'back' },
  { id: 'lat_pulldown', name: '滑輪下拉 (Lat Pulldown)', equipmentType: 'machine', targetMuscles: ['back'], bodyPart: 'back' },
  { id: 'row_db', name: '單臂啞鈴划船 (One Arm Row)', equipmentType: 'dumbbell', targetMuscles: ['back'], bodyPart: 'back' },

  // Legs
  { id: 'squat_bb', name: '槓鈴深蹲 (Barbell Squat)', equipmentType: 'barbell', targetMuscles: ['legs', 'core'], bodyPart: 'legs' },
  { id: 'leg_press', name: '腿推機 (Leg Press)', equipmentType: 'machine', targetMuscles: ['legs'], bodyPart: 'legs' },
  { id: 'lunge_db', name: '啞鈴弓步 (Dumbbell Lunge)', equipmentType: 'dumbbell', targetMuscles: ['legs'], bodyPart: 'legs' },
  { id: 'dl_bb', name: '槓鈴硬舉 (Deadlift)', equipmentType: 'barbell', targetMuscles: ['legs', 'back'], bodyPart: 'legs' },
  { id: 'leg_ext', name: '腿部伸展 (Leg Extension)', equipmentType: 'machine', targetMuscles: ['legs'], bodyPart: 'legs' },

  // Shoulders
  { id: 'ohp_bb', name: '槓鈴肩推 (Overhead Press)', equipmentType: 'barbell', targetMuscles: ['shoulders'], bodyPart: 'shoulders' },
  { id: 'ohp_db', name: '啞鈴肩推 (Dumbbell Shoulder Press)', equipmentType: 'dumbbell', targetMuscles: ['shoulders'], bodyPart: 'shoulders' },
  { id: 'lat_raise', name: '側平舉 (Lateral Raise)', equipmentType: 'dumbbell', targetMuscles: ['shoulders'], bodyPart: 'shoulders' },

  // Arms
  { id: 'curl_bb', name: '槓鈴彎舉 (Barbell Curl)', equipmentType: 'barbell', targetMuscles: ['biceps'], bodyPart: 'arms' },
  { id: 'tri_pushdown', name: '滑輪三頭下壓 (Tricep Pushdown)', equipmentType: 'machine', targetMuscles: ['triceps'], bodyPart: 'arms' },
  
  // Core
  { id: 'plank', name: '棒式 (Plank)', equipmentType: 'bodyweight', targetMuscles: ['core'], bodyPart: 'core' },
  { id: 'crunch', name: '捲腹 (Crunch)', equipmentType: 'bodyweight', targetMuscles: ['core'], bodyPart: 'core' },
];

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'push_biceps',
    name: '胸＋二頭',
    bodyParts: ['chest', 'arms', 'shoulders'],
    exercises: [
      { exerciseId: 'bp_db', defaultSets: 4, defaultReps: 10 },
      { exerciseId: 'bp_bb', defaultSets: 4, defaultReps: 8 },
      { exerciseId: 'fly_machine', defaultSets: 3, defaultReps: 12 },
      { exerciseId: 'lat_raise', defaultSets: 3, defaultReps: 15 },
      { exerciseId: 'curl_bb', defaultSets: 3, defaultReps: 10 },
    ],
  },
  {
    id: 'back_rear',
    name: '背＋肩中後束',
    bodyParts: ['back', 'shoulders', 'arms'],
    exercises: [
      { exerciseId: 'pullup', defaultSets: 4, defaultReps: 6 },
      { exerciseId: 'row_bb', defaultSets: 4, defaultReps: 8 },
      { exerciseId: 'lat_pulldown', defaultSets: 3, defaultReps: 10 },
      { exerciseId: 'row_db', defaultSets: 3, defaultReps: 12 },
    ],
  },
  {
    id: 'legs_core',
    name: '腿＋核心',
    bodyParts: ['legs', 'core'],
    exercises: [
      { exerciseId: 'squat_bb', defaultSets: 4, defaultReps: 8 },
      { exerciseId: 'leg_press', defaultSets: 4, defaultReps: 10 },
      { exerciseId: 'dl_bb', defaultSets: 3, defaultReps: 6 },
      { exerciseId: 'plank', defaultSets: 3, defaultReps: 30 },
      { exerciseId: 'crunch', defaultSets: 3, defaultReps: 20 },
    ],
  },
];

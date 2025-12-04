
export interface ExerciseDef {
  id: string;
  name: string;
  equipmentType: 'machine' | 'dumbbell' | 'barbell' | 'bodyweight';
  targetMuscles: string[];
  description?: string;
}

export const EXERCISE_LIBRARY: ExerciseDef[] = [
  // Chest
  { id: 'bp_bb', name: '槓鈴臥推 (Barbell Bench Press)', equipmentType: 'barbell', targetMuscles: ['chest', 'triceps'] },
  { id: 'bp_db', name: '啞鈴臥推 (Dumbbell Bench Press)', equipmentType: 'dumbbell', targetMuscles: ['chest', 'triceps'] },
  { id: 'pushup', name: '伏地挺身 (Push Up)', equipmentType: 'bodyweight', targetMuscles: ['chest', 'core'] },
  { id: 'fly_machine', name: '蝴蝶機夾胸 (Pec Fly)', equipmentType: 'machine', targetMuscles: ['chest'] },
  
  // Back
  { id: 'pullup', name: '引體向上 (Pull Up)', equipmentType: 'bodyweight', targetMuscles: ['back', 'biceps'] },
  { id: 'row_bb', name: '槓鈴划船 (Barbell Row)', equipmentType: 'barbell', targetMuscles: ['back', 'biceps'] },
  { id: 'lat_pulldown', name: '滑輪下拉 (Lat Pulldown)', equipmentType: 'machine', targetMuscles: ['back'] },
  { id: 'row_db', name: '單臂啞鈴划船 (One Arm Row)', equipmentType: 'dumbbell', targetMuscles: ['back'] },

  // Legs
  { id: 'squat_bb', name: '槓鈴深蹲 (Barbell Squat)', equipmentType: 'barbell', targetMuscles: ['legs', 'core'] },
  { id: 'leg_press', name: '腿推機 (Leg Press)', equipmentType: 'machine', targetMuscles: ['legs'] },
  { id: 'lunge_db', name: '啞鈴弓步 (Dumbbell Lunge)', equipmentType: 'dumbbell', targetMuscles: ['legs'] },
  { id: 'dl_bb', name: '槓鈴硬舉 (Deadlift)', equipmentType: 'barbell', targetMuscles: ['legs', 'back'] },
  { id: 'leg_ext', name: '腿部伸展 (Leg Extension)', equipmentType: 'machine', targetMuscles: ['legs'] },

  // Shoulders
  { id: 'ohp_bb', name: '槓鈴肩推 (Overhead Press)', equipmentType: 'barbell', targetMuscles: ['shoulders'] },
  { id: 'ohp_db', name: '啞鈴肩推 (Dumbbell Shoulder Press)', equipmentType: 'dumbbell', targetMuscles: ['shoulders'] },
  { id: 'lat_raise', name: '側平舉 (Lateral Raise)', equipmentType: 'dumbbell', targetMuscles: ['shoulders'] },

  // Arms
  { id: 'curl_bb', name: '槓鈴彎舉 (Barbell Curl)', equipmentType: 'barbell', targetMuscles: ['biceps'] },
  { id: 'tri_pushdown', name: '滑輪三頭下壓 (Tricep Pushdown)', equipmentType: 'machine', targetMuscles: ['triceps'] },
  
  // Core
  { id: 'plank', name: '棒式 (Plank)', equipmentType: 'bodyweight', targetMuscles: ['core'] },
  { id: 'crunch', name: '捲腹 (Crunch)', equipmentType: 'bodyweight', targetMuscles: ['core'] },
];

export type StopId = 'gun' | 'quarters' | 'signal' | 'keeper';
export type LayerId = 'structures' | 'people' | 'equipment' | 'photos' | 'stories';
export const stops: { id: StopId; title: string; category: string; year: string; color: string; layer: LayerId; x: number; y: number; description: string; story: string }[] = [
  { id: 'gun', title: 'The 10-inch gun', category: 'Military equipment', year: '1864', color: '#E75049', layer: 'equipment', x: 0.13, y: 0.36, description: 'This cast-iron barrel fired heavy projectiles toward the harbor channel. Explore the cannon and the crew who operated it.', story: 'The harbor was the gateway to the town. From this battery, soldiers watched ships approach and practiced loading the heavy cannon. A coordinated crew moved each projectile into place before the gun could fire.' },
  { id: 'quarters', title: 'Soldiers’ quarters', category: 'Historic structure', year: '1848', color: '#3485E8', layer: 'structures', x: 0.65, y: 0.51, description: 'Beyond the stone arch, soldiers ate, slept, and prepared for long shifts guarding the harbor.', story: 'Life inside the fort followed a steady rhythm of drills, meals, and watch duty. These rooms offered shelter from coastal winds, while the harbor outside connected the soldiers to a wider world.' },
  { id: 'signal', title: 'Harbor signal', category: 'Historic structure', year: '1864', color: '#3485E8', layer: 'structures', x: 0.46, y: 0.27, description: 'Signals above the harbor helped passing vessels find their way and alerted the fort to approaching ships.', story: 'Before radio, flags and lights carried messages across the water. From the high ground, a signal keeper could spot a ship long before it reached the harbor entrance.' },
  { id: 'keeper', title: 'Meet Elias Reed', category: 'Personal story', year: '1866', color: '#E75049', layer: 'people', x: 0.63, y: 0.34, description: 'Assistant lighthouse keeper · 1866. Discover the story of someone who lived and worked at Battery Point.', story: 'I am Elias Reed, an assistant keeper at Battery Point. Each evening, I climb the lighthouse stairs to prepare the lamp. The light helps sailors return safely through the channel. When the weather turns, we keep watch through the night.' },
];
export const layers: { id: LayerId; label: string; icon: 'landmark' | 'people' | 'shield' | 'photos' | 'story' }[] = [
  { id: 'structures', label: 'Structures', icon: 'landmark' },
  { id: 'people', label: 'People', icon: 'people' },
  { id: 'equipment', label: 'Military equipment', icon: 'shield' },
  { id: 'photos', label: 'Archival photographs', icon: 'photos' },
  { id: 'stories', label: 'Personal stories', icon: 'story' },
];

export const harvardTestStop = {
  ...stops[0], title: 'Harvard test spot', category: 'Location test', year: 'Today',
  description: 'You are near your saved test location. Tap the red tile to explore this spot through AR.',
  story: 'Welcome to your Harvard location test. This story is attached to the GPS spot you saved on your phone. The floating red marker uses the global position you save in AR. GPS and compass accuracy may shift its placement.',
};

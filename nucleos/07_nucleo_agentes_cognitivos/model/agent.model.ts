export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'frozen';
}
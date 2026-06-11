import { Building2, Users, Wifi } from 'lucide-react';

const stats = [
  { label: 'Phong dang quan ly', value: '24', icon: Building2 },
  { label: 'Ho so sinh vien', value: '186', icon: Users },
  { label: 'Tin nhan hom nay', value: '58', icon: Wifi },
];

export default function App() {
  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">RoomieMatch</p>
          <h1>Dashboard chu tro</h1>
        </div>
        <button type="button">Them phong</button>
      </section>

      <section className="stats-grid">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article className="stat-card" key={item.label}>
              <Icon size={22} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          );
        })}
      </section>
    </main>
  );
}

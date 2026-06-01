import styles from './TopBar.module.css';

interface TopBarProps {
  userLabel: string;
  totalDistanceKm: number | null;
  onSignOut: () => void;
}

export default function TopBar({ userLabel, totalDistanceKm, onSignOut }: TopBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.user}>{userLabel}</span>

      {totalDistanceKm !== null && (
        <span className={styles.distance}>{totalDistanceKm.toFixed(2)} km</span>
      )}

      <button className={styles.signOutBtn} onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
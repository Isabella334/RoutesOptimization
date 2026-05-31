import styles from './TopBar.module.css';

interface TopBarProps {
  userLabel: string;
  closed: boolean;
  onClosedChange: (closed: boolean) => void;
  totalDistanceKm: number | null;
  onSignOut: () => void;
}

export default function TopBar({
  userLabel,
  closed,
  onClosedChange,
  totalDistanceKm,
  onSignOut,
}: TopBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.user}>{userLabel}</span>

      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={closed}
          onChange={e => onClosedChange(e.target.checked)}
        />
        Closed route
      </label>

      {totalDistanceKm !== null && (
        <span className={styles.distance}>{totalDistanceKm.toFixed(2)} km</span>
      )}

      <button className={styles.signOutBtn} onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}

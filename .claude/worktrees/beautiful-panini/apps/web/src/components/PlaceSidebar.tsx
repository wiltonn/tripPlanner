import type { PlaceClickData } from "./MapInteractions";

interface PlaceSidebarProps {
  place: PlaceClickData | null;
  onClose: () => void;
}

export default function PlaceSidebar({ place, onClose }: PlaceSidebarProps) {
  if (!place) return null;

  return (
    <div className="place-sidebar open">
      <div className="place-sidebar-header">
        <h2>{place.name}</h2>
        <button className="place-sidebar-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>
      <div className="place-sidebar-body">
        <div className="place-sidebar-field">
          <span className="place-sidebar-label">Category</span>
          <span className="place-sidebar-value">{place.category}</span>
        </div>
        {place.dayIndex !== undefined && (
          <div className="place-sidebar-field">
            <span className="place-sidebar-label">Day</span>
            <span className="place-sidebar-value">Day {place.dayIndex + 1}</span>
          </div>
        )}
      </div>
    </div>
  );
}

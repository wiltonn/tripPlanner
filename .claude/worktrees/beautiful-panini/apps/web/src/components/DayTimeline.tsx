interface DayTimelineProps {
  dayCount: number;
  activeDayIndex: number;
  onDayChange: (index: number) => void;
}

export default function DayTimeline({ dayCount, activeDayIndex, onDayChange }: DayTimelineProps) {
  return (
    <div className="day-timeline">
      {Array.from({ length: dayCount }, (_, i) => (
        <button
          key={i}
          className={`day-timeline-btn ${i === activeDayIndex ? "active" : ""}`}
          onClick={() => onDayChange(i)}
        >
          Day {i + 1}
        </button>
      ))}
    </div>
  );
}

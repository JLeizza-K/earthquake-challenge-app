interface HamburgerBtnProps {
  show: boolean;
  onToggle: () => void;
}

export default function HamburgerBtn({ show, onToggle }: HamburgerBtnProps) {
  return (
    <button
      type="button"
      aria-label="Toggle filter panel"
      onClick={onToggle}
      className={`fixed top-4 left-4 z-[2] ${show ? '' : 'hidden'} lg:hidden bg-white rounded p-1 shadow text-xl`}
    >
      ☰
    </button>
  );
}

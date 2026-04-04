import { useTheme } from "../context/ThemeContext";
import { FaMoon, FaSun } from "react-icons/fa";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      title="Toggle theme"
      className="flex items-center justify-center w-9 h-9 rounded-full cursor-pointer
        bg-white/70 dark:bg-white/5 
        border border-slate-200 dark:border-[#444] 
        hover:border-indigo-400 dark:hover:border-[#E50914] 
        transition-all shadow-sm dark:shadow-none"
    >
      {isDark ? (
        <FaSun size={15} color="#fbbf24" /> // Yellow Sun
      ) : (
        <FaMoon size={15} color="#4f46e5" /> // Indigo Moon
      )}
    </button>
  );
};

export default ThemeToggle;

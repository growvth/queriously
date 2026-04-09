import { useSettingsStore } from "../../store/settingsStore";

type Props = {
  size?: number;
  className?: string;
};

/**
 * Brand mark. Picks the logo variant with the background that blends into
 * the active theme so the crimson Q reads cleanly against chrome surfaces.
 */
export function Logo({ size = 20, className }: Props) {
  const theme = useSettingsStore((s) => s.theme);
  const src = theme === "dark" ? "/logo-dark.png" : "/logo-light.png";
  return (
    <img
      src={src}
      alt="Queriously"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

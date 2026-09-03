import { useI18n } from "@/lib/i18n";

export type ChartStyle = "north" | "south" | "east";

export interface ChartData {
  ascSign: number;
  /** sign index (0-11) -> short planet labels */
  bodies: Record<number, string[]>;
  title?: string;
}

const SIGN_SHORT = ["Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"];

function Cell({
  x,
  y,
  signNumber,
  labels,
  isAsc,
}: {
  x: number;
  y: number;
  signNumber: number;
  labels: string[];
  isAsc: boolean;
}) {
  return (
    <g>
      <text
        x={x}
        y={y - 12}
        textAnchor="middle"
        className="fill-primary"
        fontSize="11"
        fontWeight="700"
      >
        {signNumber + 1}
        {isAsc ? " ·" : ""}
      </text>
      {labels.map((l, i) => (
        <text
          key={l + i}
          x={x}
          y={y + 2 + i * 11}
          textAnchor="middle"
          className="fill-foreground"
          fontSize="10.5"
        >
          {l}
        </text>
      ))}
    </g>
  );
}

const NORTH_POS: [number, number][] = [
  [150, 62], [75, 34], [36, 76], [62, 150], [36, 226], [75, 268],
  [150, 240], [225, 268], [264, 226], [238, 150], [264, 76], [225, 34],
];

const SOUTH_GRID: [number, number][] = [
  // sign index -> cell top-left in a 4x4 grid of 75px
  [75, 0], [150, 0], [225, 0], [225, 75], [225, 150], [225, 225],
  [150, 225], [75, 225], [0, 225], [0, 150], [0, 75], [0, 0],
];

const EAST_POS: [number, number][] = [
  [95, 40], [150, 82], [205, 40], [268, 100], [228, 152], [268, 208],
  [205, 268], [150, 228], [95, 268], [32, 208], [72, 152], [32, 100],
];

export function VedicChart({
  data,
  style,
  size = 320,
}: {
  data: ChartData;
  style: ChartStyle;
  size?: number;
}) {
  const { tSign } = useI18n();
  const stroke = "var(--chart-line)";

  const cells = (getPos: (i: number) => [number, number], houseBased: boolean) =>
    Array.from({ length: 12 }, (_, i) => {
      const sign = houseBased ? (data.ascSign + i) % 12 : i;
      const [x, y] = getPos(i);
      return (
        <Cell
          key={i}
          x={x}
          y={y}
          signNumber={sign}
          labels={data.bodies[sign] ?? []}
          isAsc={sign === data.ascSign}
        />
      );
    });

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 300 300" width={size} height={size} className="max-w-full">
        <rect x="1" y="1" width="298" height="298" fill="none" stroke={stroke} strokeWidth="1.5" />
        {style === "north" && (
          <>
            <line x1="0" y1="0" x2="300" y2="300" stroke={stroke} />
            <line x1="300" y1="0" x2="0" y2="300" stroke={stroke} />
            <polygon points="150,0 300,150 150,300 0,150" fill="none" stroke={stroke} />
            {cells((i) => NORTH_POS[i]!, true)}
          </>
        )}
        {style === "south" && (
          <>
            {SOUTH_GRID.map(([gx, gy], i) => (
              <rect key={i} x={gx} y={gy} width="75" height="75" fill="none" stroke={stroke} />
            ))}
            {cells((i) => {
              const [gx, gy] = SOUTH_GRID[i]!;
              return [gx + 37.5, gy + 32];
            }, false)}
          </>
        )}
        {style === "east" && (
          <>
            <polygon points="150,0 300,150 150,300 0,150" fill="none" stroke={stroke} />
            <line x1="0" y1="0" x2="75" y2="75" stroke={stroke} />
            <line x1="300" y1="0" x2="225" y2="75" stroke={stroke} />
            <line x1="300" y1="300" x2="225" y2="225" stroke={stroke} />
            <line x1="0" y1="300" x2="75" y2="225" stroke={stroke} />
            <line x1="150" y1="0" x2="150" y2="300" stroke={stroke} strokeDasharray="0" opacity="0" />
            <line x1="75" y1="75" x2="225" y2="225" stroke={stroke} />
            <line x1="225" y1="75" x2="75" y2="225" stroke={stroke} />
            {cells((i) => EAST_POS[i]!, false)}
          </>
        )}
      </svg>
      <p className="text-xs text-muted-foreground">
        {data.title} · {tSign(data.ascSign)} {SIGN_SHORT[data.ascSign]} Lagna
      </p>
    </div>
  );
}

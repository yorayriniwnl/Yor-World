/**
 * Allowlisted Terminal Commands for Studio Monitor Launcher.
 * Enforces strict command parsing: test strings resembling shell/code instructions
 * are treated as unsupported text and never executed.
 */

export interface TerminalCommandResult {
  output: string[];
  clear?: boolean;
  action?: "openProject" | "openRoute" | "close" | "theme" | "blinds" | "clock";
  target?: string;
}



// Patterns resembling shell execution, injection, piping, or arbitrary scripting
const SHELL_SUSPICIOUS_REGEX = /([;&|><$`\\]|\b(rm|sudo|curl|wget|cat|bash|sh|zsh|powershell|cmd|eval|exec|chmod|chown|kill|python|node|ruby|perl|sed|awk)\b|<script)/i;

const PUBLISHED_PROJECTS = [
  { id: "ai-vs-real", slug: "ai-vs-real", name: "AI vs. Real Image Detector", motif: "Computer Vision / Scanner" },
  { id: "helios", slug: "helios", name: "Helios Computing System", motif: "Systems / Chassis Pulse" },
  { id: "zenith", slug: "zenith", name: "Yor Zenith Solar Platform", motif: "Simulation / Energy Trace" },
  { id: "talks", slug: "talks", name: "Yor Talks Engineering Broadcast", motif: "Audio / Broadcast Chime" },
] as const;

export function executeTerminalCommand(input: string): TerminalCommandResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { output: [] };
  }

  // Check for shell / code / dangerous patterns first
  if (SHELL_SUSPICIOUS_REGEX.test(trimmed)) {
    return {
      output: [
        "Unsupported command: Shell and script execution are strictly prohibited.",
        "The studio terminal only accepts allowlisted navigation and telemetry commands.",
        "Type 'help' for the list of available commands.",
      ],
    };
  }

  const parts = trimmed.split(/\s+/);
  const first = parts[0];
  if (!first) return { output: [] };
  const command = first.toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case "help":
      return {
        output: [
          "Studio Workstation Terminal — Supported Commands:",
          "  help                  Show this help reference",
          "  projects, ls          List verified case studies and status",
          "  open <project_id>     Open a specific project case study",
          "  about                 Display creator identity and background",
          "  contact               Display verified contact channels",
          "  resume                Navigate to engineering résumé",
          "  status                Display studio runtime environment telemetry",
          "  lamp, theme           Toggle desk task lamp",
          "  blinds                Toggle window blinds",
          "  clock                 Toggle 12h/24h clock display format",
          "  whoami                Display session visitor identity",
          "  clear                 Clear terminal output history",
          "  exit, close           Return to 3D studio exploration view",
        ],
      };

    case "projects":
    case "ls":
    case "list":
      return {
        output: [
          "Published & Verified Projects (Publication Rev 1):",
          ...PUBLISHED_PROJECTS.map(
            (p) => `  * ${p.id.padEnd(12)} - ${p.name} [${p.motif}] -> /projects/${p.slug}`
          ),
          "",
          "Unpublished Candidates:",
          "  * candidatex   - CandidateX [Unpublished · Evidence Verification Pending]",
          "",
          "Use 'open <id>' to inspect a verified case study directly.",
        ],
      };

    case "open": {
      const rawTarget = args[0];
      if (!rawTarget) {
        return {
          output: ["Error: Missing project identifier. Usage: open <project_id> (e.g., 'open zenith')"],
        };
      }
      const targetId = rawTarget.toLowerCase();
      if (targetId === "candidatex") {
        return {
          output: [
            "Cannot open 'candidatex': Project evidence is unverified and holds draft status.",
            "In accordance with Standard C01, unpublished candidates cannot be navigated.",
          ],
        };
      }
      const matched = PUBLISHED_PROJECTS.find(
        (p) => p.id === targetId || p.slug === targetId
      );
      if (!matched) {
        return {
          output: [
            `Error: Unknown project '${targetId}'.`,
            "Valid projects: ai-vs-real, helios, zenith, talks. Type 'projects' for details.",
          ],
        };
      }
      return {
        output: [`Initiating project transition to ${matched.name} (${matched.id})...`],
        action: "openProject",
        target: matched.id,
      };
    }

    case "about":
      return {
        output: [
          "Ayush Roy — Systems & Computer Vision Engineer (MIT Manipal '26)",
          "Focus: Embedded systems, computer vision forensics, solar simulation, full-stack architecture.",
          "Navigating to /about...",
        ],
        action: "openRoute",
        target: "/about",
      };

    case "contact":
      return {
        output: [
          "Direct Contact Channels:",
          "  Email: ayushroy@mit.edu",
          "  GitHub: https://github.com/yorayriniwnl",
          "  LinkedIn: https://linkedin.com/in/ayush-roy",
          "Navigating to /contact...",
        ],
        action: "openRoute",
        target: "/contact",
      };

    case "resume":
      return {
        output: ["Navigating to /resume..."],
        action: "openRoute",
        target: "/resume",
      };

    case "status":
      return {
        output: [
          "Studio Environment Status:",
          "  Runtime: Three.js WebGL2 / Next.js 16 Hybrid",
          "  Camera Owner: CameraDirector (primary-camera-director)",
          "  Character Owner: CharacterDirector (seated rest at F1)",
          "  Arbitration: IntentArbitrator (6-tier deterministic priority)",
          "  Time Budget: Max 1.4s project transition delay",
        ],
      };

    case "lamp":
    case "theme":
      return {
        output: ["Toggling desk task lamp illumination..."],
        action: "theme",
      };

    case "blinds":
      return {
        output: ["Toggling window blinds state..."],
        action: "blinds",
      };

    case "clock":
      return {
        output: ["Toggling desk clock 12h/24h format..."],
        action: "clock",
      };

    case "whoami":
      return {
        output: ["visitor@yor-world-studio (authenticated guest session)"],
      };

    case "clear":
      return {
        output: [],
        clear: true,
      };

    case "exit":
    case "close":
    case "quit":
      return {
        output: ["Exiting monitor launcher..."],
        action: "close",
      };

    default:
      return {
        output: [
          `Command not recognized: '${command}'. Type 'help' for allowlisted commands.`,
        ],
      };
  }
}

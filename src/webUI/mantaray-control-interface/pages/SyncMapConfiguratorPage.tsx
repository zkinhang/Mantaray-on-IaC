import React, { useMemo, useState } from 'react';
import { CheckSquare, Layers, Monitor, Network, Server, Wrench, Rocket } from 'lucide-react';

interface PlanSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  goal: string;
  items: string[];
}

const PLAN_SECTIONS: PlanSection[] = [
  {
    id: 'frontend',
    title: 'Frontend - React + Vite',
    icon: Monitor,
    goal: 'Goal: Extreme simplicity with point-and-click calibration flow.',
    items: [
      'Visual Layout (Robot View): Draw Mantaray top view with thrusters 1-8 and status indicators (color/animation while spinning).',
      'All Start button: Add a prominent center button for full-fleet test launch.',
      'Operation logic: On click, send thruster=0 (or reserved ID) and power so backend applies same power to all 8 thrusters.',
      'Real-time Parameter Editor: For each thruster provide ID option and direction toggle (+/-). Show live Mapping Array preview string at bottom.',
      'Interactive Control Buttons: Click thruster icon to toggle /api/test and /api/stop. Include global E-Stop to stop all running tests.',
      'Swap Mode: Select any two thrusters and swap their array position and value in one action.',
      'Save Config: Confirmation dialog, then POST configuration to /api/save.'
    ]
  },
  {
    id: 'middleware',
    title: 'Middleware API - Node.js/Express',
    icon: Network,
    goal: 'Goal: Safe and reliable command dispatch center.',
    items: [
      'Sanitization filter: Strict validation for Mapping String, only digits, comma, minus sign are allowed.',
      'Dynamic process orchestration: Single-running lock for test script. New request kills previous task. Use async child_process.spawn with docker exec and stream status.',
      'Persistence endpoint (/api/save): Rewrite ansible/config/robot_params.json and trigger ansible-playbook -i inventory apply_config.yml automatically.',
      'Audit logging: Record every mapping update and swap action for traceability.'
    ]
  },
  {
    id: 'backend',
    title: 'Backend Script - ThrusterBoard_API.py',
    icon: Server,
    goal: 'Goal: Precise hardware execution with safety guarantees.',
    items: [
      'Parameterized CLI support: Complete argparse support for --mapping and --thruster.',
      'Continuous thrust mode: Loop-send thrust packets until explicit termination signal is received.',
      'Safe exit (Zero-Thrust on Exit): Intercept system signals and force zero-thrust command before process exits.'
    ]
  },
  {
    id: 'iac',
    title: 'System and IaC Integration',
    icon: Wrench,
    goal: 'Goal: Close the automation loop in infrastructure.',
    items: [
      'Ansible distribution: Playbook to push updated robot_params.json to Pi nodes, then docker restart manta_node for hot reload.',
      'Permission sandbox: Configure WebUI user sudo permissions for docker commands and ensure backend can execute ansible commands safely.'
    ]
  }
];

export const SyncMapConfiguratorPage: React.FC = () => {
  const [allStartPower, setAllStartPower] = useState<number>(0.3);
  const [isStartingAll, setIsStartingAll] = useState(false);
  const [allStartStatus, setAllStartStatus] = useState<string>('');

  const allStartPowerText = useMemo(() => allStartPower.toFixed(2), [allStartPower]);

  const handleAllStart = async () => {
    setIsStartingAll(true);
    setAllStartStatus('Dispatching ALL START command...');
    try {
      const res = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thruster: 0, power: allStartPower }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }

      setAllStartStatus(`ALL START sent: thruster=0, power=${allStartPower.toFixed(2)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setAllStartStatus(`ALL START failed: ${message}`);
    } finally {
      setIsStartingAll(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-1">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        <section className="bg-k3s-block border-2 border-k3s-primary rounded p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Layers className="w-5 h-5 text-k3s-primary" />
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wide">
              SyncMap Configurator
            </h1>
          </div>
          <p className="text-sm text-k3s-muted leading-relaxed">
            Mapping Configurator Grand Plan. This page is the implementation blueprint for thruster mapping,
            testing flow, save pipeline, and infrastructure automation.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 border border-k3s-border rounded bg-k3s-dark/40">
            <CheckSquare className="w-4 h-4 text-k3s-primary" />
            <span className="text-xs text-k3s-muted uppercase tracking-wide">Planning Checklist</span>
          </div>
        </section>

        <section className="bg-k3s-block border-2 border-k3s-primary rounded p-5 md:p-7">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-k3s-border bg-k3s-dark/40 mb-3">
              <Rocket className="w-4 h-4 text-k3s-primary" />
              <span className="text-xs text-k3s-muted uppercase tracking-widest">All Start</span>
            </div>
            <h2 className="text-lg md:text-xl font-black uppercase tracking-wide text-white">
              Full Fleet Start (All 8 Thrusters)
            </h2>
            <p className="mt-2 text-sm text-k3s-muted">
              Click to send <span className="text-k3s-primary font-semibold">thruster=0</span> with your selected power.
              Backend interprets this as applying the same power to all 8 thrusters.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[0.3, 0.5, 0.7, 1.0].map((value) => (
                <button
                  key={value}
                  onClick={() => setAllStartPower(value)}
                  className={[
                    'px-3 py-1.5 text-sm font-semibold rounded border transition-colors',
                    Math.abs(allStartPower - value) < 0.001
                      ? 'bg-k3s-primary text-white border-k3s-primary'
                      : 'bg-k3s-dark text-k3s-muted border-k3s-border hover:text-white hover:border-k3s-primary',
                  ].join(' ')}
                >
                  P={value.toFixed(1)}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <button
                onClick={handleAllStart}
                disabled={isStartingAll}
                className="mx-auto inline-flex items-center gap-2 px-8 py-3 rounded text-sm md:text-base font-black uppercase tracking-wider bg-k3s-primary text-white border-2 border-k3s-primary hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <Rocket className="w-4 h-4" />
                {isStartingAll ? 'Launching...' : 'All Start'}
              </button>
            </div>

            <div className="mt-3 text-xs font-mono text-k3s-muted">
              Active power: {allStartPowerText}
            </div>
            {allStartStatus && (
              <div className="mt-2 text-xs text-k3s-muted">
                {allStartStatus}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {PLAN_SECTIONS.map((section) => (
            <article key={section.id} className="bg-k3s-block border border-k3s-border rounded p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-2 rounded bg-k3s-dark border border-k3s-border">
                  <section.icon className="w-4 h-4 text-k3s-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm md:text-base font-bold text-white uppercase tracking-wide">
                    {section.title}
                  </h2>
                  <p className="text-xs text-k3s-muted mt-1">{section.goal}</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2.5">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-k3s-text leading-relaxed">
                    <span className="mt-1 text-k3s-primary">[ ]</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

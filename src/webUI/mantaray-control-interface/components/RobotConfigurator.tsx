import React, { useState, useEffect, useCallback } from 'react';
import { fetchLatestParams, fetchParamHistory, saveParams, RobotParameterDTO } from '../services/api';
import { Settings, Save, AlertTriangle, History, Clock, FileJson, ChevronDown, ChevronUp, RotateCcw, LayoutList, Gamepad2, Compass, Wrench, Edit3, FileText } from 'lucide-react';
import * as Diff from 'diff';

const DEFAULT_PARAMS = {
    "pid_system": {
        "ros__parameters": {
            "sample_time_sec": 0.05,
            "step_time_sec": 0.3,
            "pitch": {
                "kp": -20.0,
                "ki": -5.0,
                "kd": 0.0,
                "setpoint": 0.0,
                "output_limits": [0.0, 0.0]
            },
            "yaw": {
                "kp": 0.7,
                "ki": 0.01,
                "kd": 0.1,
                "setpoint": 0.0,
                "output_limits": [-50.0, 50.0]
            },
            "roll": {
                "kp": 5.0,
                "ki": 0.0,
                "kd": 1.0,
                "setpoint": 0.0,
                "output_limits": [0.0, 0.0]
            },
            "depth": {
                "kp": 0.37,
                "ki": 0.17,
                "kd": 3.1,
                "setpoint": null,
                "output_limits": [-50.0, 50.0]
            }
        }
    },
    "thrusterboard_rosserial": {
        "ros__parameters": {
            "thrusterboard_config": {
                "board_hw_id": "1A86:7523",
                "port_name": "USB0",
                "mapping": [7, 3, 6, -5, 2, -1, -4, -8]
            },
            "thruster_direction_matrices": {
                "HOLD":           [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
                "FORWARD":        [-1.0, -0.8, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0],
                "UP":             [ 0.0, 0.0, 0.0, 0.0, -1.0, -1.0, -1.0, -1.0 ],
                "LEFT":           [ 1.0, -1.0, 1.0, -1.0, 0.0, 0.0, 0.0, 0.0 ],
                "LEFT_YAW":       [ 1.0, -1.0, -1.0, 1.0, 0.0, 0.0, 0.0, 0.0 ],
                "FRONT_PITCH":    [ 0.0, 0.0, 0.0, 0.0, -1.0, -1.0, 1.0, 1.0 ],
                "LEFT_ROLL":      [ 0.0, 0.0, 0.0, 0.0, -1.0, 1.0, -1.0, 1.0 ],
                "STOP":           [ 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0 ]
            }
        }
    },
    "ahrs_driver_node": {
        "ros__parameters": {
            "serial_port_": "/dev/ttyUSB1",
            "serial_baud_": 921600,
            "if_debug_": false,
            "device_type_": 1,
            "imu_topic": "/imu",
            "imu_frame_id_": "gyro_link",
            "mag_pose_2d_topic": "/mag_pose_2d",
            "Magnetic_topic": "/magnetic",
            "Euler_angles_topic": "/euler_angles",
            "gps_topic": "/gps/fix",
            "twist_topic": "/system_speed",
            "NED_odom_topic": "/NED_odometry"
        }
    },
    "command_decomposer": {
        "ros__parameters": {
            "gripper_config": {
                "dpad_power": 0.65,
                "a_pwm_step": 30,
                "b_pwm_step": 85,
                "c_pwm_step": 50,
                "a_pwm_min": 550,
                "a_pwm_max": 2450,
                "b_pwm_min": 550,
                "b_pwm_max": 2450,
                "c_pwm_min": 550,
                "c_pwm_max": 2450,
                "initial_gripper_a_values": [1400.0, 1400.0, 1400.0],
                "initial_gripper_b_values": [1400.0, 1400.0, 1400.0],
                "gripper_a_mapping": [0, 1, 2],
                "gripper_b_mapping": [0, 1, 2],
                "gripper_a_continuous_mapping": [0, 1, 1],
                "gripper_b_continuous_mapping": [0, 1, 1]
            }
        }
    }
};

type ViewMode = 'pid' | 'thruster' | 'ahrs' | 'gripper' | 'raw';

interface RobotConfiguratorProps {
  activeTab: 'editor' | 'history';
}

export const RobotConfigurator: React.FC<RobotConfiguratorProps> = ({ activeTab }) => {
  const [params, setParams] = useState<any>(DEFAULT_PARAMS);
  const [viewMode, setViewMode] = useState<ViewMode>('pid');
  const [currentText, setCurrentText] = useState<string>('');
  
  const [versionName, setVersionName] = useState<string>('');
  const [history, setHistory] = useState<RobotParameterDTO[]>([]);
  const [expandedDiffs, setExpandedBlocks] = useState<Record<number, boolean>>({});
  const [showFullContent, setShowFullContent] = useState<Record<number, boolean>>({});
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const latest = await fetchLatestParams();
    if (latest && latest.parameters) {
      setParams(latest.parameters);
      setCurrentText(JSON.stringify(latest.parameters, null, 4));
    } else {
      setCurrentText(JSON.stringify(DEFAULT_PARAMS, null, 4));
    }
    const historyData = await fetchParamHistory();
    setHistory(historyData);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleModeChange = (mode: ViewMode) => {
    if (mode === 'raw') {
      setCurrentText(JSON.stringify(params, null, 4));
      setViewMode('raw');
    } else {
      if (viewMode === 'raw') {
        try {
          const parsed = JSON.parse(currentText);
          setParams(parsed);
          setParseError(null);
          setViewMode(mode);
        } catch (e: any) {
          setParseError(`Invalid JSON: ${e.message}`);
        }
      } else {
        setViewMode(mode);
      }
    }
  };

  const handleUpdateNested = (path: (string | number)[], value: any) => {
    setParams((prev: any) => {
      const copy = structuredClone(prev);
      let current = copy;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return copy;
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCurrentText(value);
    
    if (value.trim() === '') {
      setParseError('Configuration cannot be empty');
      return;
    }
    try {
      JSON.parse(value);
      setParseError(null);
    } catch (e: any) {
      setParseError(`Invalid JSON: ${e.message}`);
    }
  };

  const handleSave = async (isDraft: boolean = false) => {
    if (viewMode === 'raw' && parseError) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const parsedJson = viewMode === 'raw' ? JSON.parse(currentText) : params;
      await saveParams(parsedJson, versionName.trim() || undefined, isDraft);
      
      setVersionName('');
      await loadData();
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const resumeEditing = (record: RobotParameterDTO) => {
    setParams(record.parameters);
    setCurrentText(JSON.stringify(record.parameters, null, 4));
    setVersionName(`${record.versionName || 'Restore'} (Editing)`);
  };

  const submitToDeploy = async (record: RobotParameterDTO) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveParams(record.parameters, `Deployed from v${record.id}`, false);
      await loadData();
    } catch (e: any) {
      setSaveError(e.message || 'Failed to deploy configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPidBlock = (axis: string) => {
    const pidData = params.pid_system?.ros__parameters?.[axis] || { kp: 0, ki: 0, kd: 0, setpoint: 0, output_limits: [0, 0] };
    return (
      <div className="border border-k3s-border p-4 bg-k3s-dark/50">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 pb-2 border-b border-dashed border-k3s-border/50">{axis.toUpperCase()} PID</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">kp</label>
            <input 
              type="number" step="0.01" value={pidData.kp} 
              onChange={e => handleUpdateNested(['pid_system', 'ros__parameters', axis, 'kp'], parseFloat(e.target.value))} 
              className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors" 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">ki</label>
            <input 
              type="number" step="0.01" value={pidData.ki} 
              onChange={e => handleUpdateNested(['pid_system', 'ros__parameters', axis, 'ki'], parseFloat(e.target.value))} 
              className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors"  
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">kd</label>
            <input 
              type="number" step="0.01" value={pidData.kd} 
              onChange={e => handleUpdateNested(['pid_system', 'ros__parameters', axis, 'kd'], parseFloat(e.target.value))} 
              className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors"  
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">Setpoint</label>
            <input 
              type="number" step="0.01" value={pidData.setpoint === null ? '' : pidData.setpoint} 
              onChange={e => handleUpdateNested(['pid_system', 'ros__parameters', axis, 'setpoint'], e.target.value === '' ? null : parseFloat(e.target.value))} 
              className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors placeholder:text-k3s-muted/30"
              placeholder="null"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">Limit Min</label>
            <input 
              type="number" step="0.01" value={pidData.output_limits?.[0] ?? 0} 
              onChange={e => handleUpdateNested(['pid_system', 'ros__parameters', axis, 'output_limits', 0], parseFloat(e.target.value))} 
              className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors"  
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">Limit Max</label>
            <input 
              type="number" step="0.01" value={pidData.output_limits?.[1] ?? 0} 
              onChange={e => handleUpdateNested(['pid_system', 'ros__parameters', axis, 'output_limits', 1], parseFloat(e.target.value))} 
              className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors"  
            />
          </div>
        </div>
      </div>
    );
  };

  const renderArrayInput = (path: (string | number)[], label: string, indexCount: number, step: string = "1", columns?: number) => {
    let current = params;
    for (let i = 0; i < path.length; i++) {
        current = current?.[path[i]];
    }
    const arr = Array.isArray(current) ? current : Array(indexCount).fill(0);
    
    return (
      <div className="mb-4">
        <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-2">{label}</label>
        <div className={columns ? `grid grid-cols-${columns} gap-2` : "flex gap-1 overflow-x-auto pb-2"}>
          {Array.from({ length: indexCount }).map((_, idx) => (
            <input 
              key={idx}
              type="number" step={step} value={arr[idx] ?? 0} 
              onChange={e => handleUpdateNested([...path, idx], parseFloat(e.target.value))} 
              className={`${columns ? 'w-full' : 'w-16 shrink-0'} bg-k3s-dark border border-k3s-border p-2 text-xs text-center text-white focus:outline-none focus:border-k3s-primary transition-colors`}  
            />
          ))}
        </div>
      </div>
    );
  };

  const renderForm = () => {
    return (
      <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
        {viewMode === 'pid' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-k3s-primary uppercase tracking-widest">PID Systems Matrix</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col md:max-w-md gap-4">
                {renderPidBlock('yaw')}
                {renderPidBlock('pitch')}
              </div>
              <div className="flex flex-col md:max-w-md gap-4">
                {renderPidBlock('depth')}
                {renderPidBlock('roll')}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'thruster' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-k3s-primary uppercase tracking-widest mb-4">Thruster Board Config</h2>
            <div className="grid grid-cols-1 gap-8">
              <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">Board HW ID</label>
                      <input 
                        type="text" value={params.thrusterboard_rosserial?.ros__parameters?.thrusterboard_config?.board_hw_id || ''} 
                        onChange={e => handleUpdateNested(['thrusterboard_rosserial', 'ros__parameters', 'thrusterboard_config', 'board_hw_id'], e.target.value)} 
                        className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors"  
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">Port Name</label>
                      <input 
                        type="text" value={params.thrusterboard_rosserial?.ros__parameters?.thrusterboard_config?.port_name || ''} 
                        onChange={e => handleUpdateNested(['thrusterboard_rosserial', 'ros__parameters', 'thrusterboard_config', 'port_name'], e.target.value)} 
                        className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors"  
                      />
                    </div>
                  </div>
                  {renderArrayInput(['thrusterboard_rosserial', 'ros__parameters', 'thrusterboard_config', 'mapping'], 'Mapping', 8, '1')}
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-k3s-border/30">
              <h2 className="text-sm font-bold text-k3s-primary uppercase tracking-widest mb-4">Thruster Direction Matrices</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['HOLD', 'FORWARD', 'UP', 'LEFT', 'LEFT_YAW', 'FRONT_PITCH', 'LEFT_ROLL', 'STOP'].map(matrix => (
                  <div key={matrix} className="bg-k3s-dark/50 p-4 border border-k3s-border">
                      {renderArrayInput(['thrusterboard_rosserial', 'ros__parameters', 'thruster_direction_matrices', matrix], matrix, 8, '0.1', 2)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'ahrs' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-k3s-primary uppercase tracking-widest mb-4">AHRS Driver Node</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">Serial Port</label>
                      <input 
                        type="text" value={params.ahrs_driver_node?.ros__parameters?.serial_port_ || ''} 
                        onChange={e => handleUpdateNested(['ahrs_driver_node', 'ros__parameters', 'serial_port_'], e.target.value)} 
                        className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors"  
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">Serial Baud</label>
                      <input 
                        type="number" value={params.ahrs_driver_node?.ros__parameters?.serial_baud_ || 0} 
                        onChange={e => handleUpdateNested(['ahrs_driver_node', 'ros__parameters', 'serial_baud_'], parseInt(e.target.value))} 
                        className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors"  
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={params.ahrs_driver_node?.ros__parameters?.if_debug_ || false} onChange={e => handleUpdateNested(['ahrs_driver_node', 'ros__parameters', 'if_debug_'], e.target.checked)} className="w-4 h-4 text-k3s-primary bg-k3s-dark border-k3s-border focus:ring-k3s-primary focus:ring-2" />
                      <span className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block">If Debug</span>
                    </label>
                    <div>
                      <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">Device Type</label>
                      <input type="number" value={params.ahrs_driver_node?.ros__parameters?.device_type_ || 0} onChange={e => handleUpdateNested(['ahrs_driver_node', 'ros__parameters', 'device_type_'], parseInt(e.target.value))} className="w-full bg-k3s-dark border border-k3s-border p-1.5 text-xs text-white focus:outline-none focus:border-k3s-primary transition-colors" />
                    </div>
                  </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'gripper' && (
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-k3s-primary uppercase tracking-widest">Gripper Config</h2>
            </div>

            {/* General Configuration */}
            <div className="bg-k3s-dark/50 p-4 border border-k3s-border">
                <h3 className="text-xs text-white font-bold tracking-widest uppercase mb-4 border-b border-white/10 pb-2">General System Power</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">DPAD Power</label>
                        <input type="number" step="0.01" value={params.command_decomposer?.ros__parameters?.gripper_config?.dpad_power || 0} onChange={e => handleUpdateNested(['command_decomposer', 'ros__parameters', 'gripper_config', 'dpad_power'], parseFloat(e.target.value))} className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Servo A Config */}
              <div className="bg-k3s-dark/50 p-4 border border-k3s-border flex flex-col gap-6">
                  <h3 className="text-sm text-white font-bold tracking-widest uppercase border-b border-white/10 pb-2">Servo A Config</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">PWM Step</label>
                        <input type="number" value={params.command_decomposer?.ros__parameters?.gripper_config?.a_pwm_step || 0} onChange={e => handleUpdateNested(['command_decomposer', 'ros__parameters', 'gripper_config', 'a_pwm_step'], parseInt(e.target.value))} className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">PWM Min / Max</label>
                        <div className="flex gap-2">
                          <input type="number" value={params.command_decomposer?.ros__parameters?.gripper_config?.a_pwm_min || 0} onChange={e => handleUpdateNested(['command_decomposer', 'ros__parameters', 'gripper_config', 'a_pwm_min'], parseInt(e.target.value))} className="w-1/2 bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary" placeholder="Min" />
                          <input type="number" value={params.command_decomposer?.ros__parameters?.gripper_config?.a_pwm_max || 0} onChange={e => handleUpdateNested(['command_decomposer', 'ros__parameters', 'gripper_config', 'a_pwm_max'], parseInt(e.target.value))} className="w-1/2 bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary" placeholder="Max" />
                        </div>
                    </div>
                  </div>
              </div>

              {/* Servo B Config */}
              <div className="bg-k3s-dark/50 p-4 border border-k3s-border flex flex-col gap-6">
                  <h3 className="text-sm text-white font-bold tracking-widest uppercase border-b border-white/10 pb-2">Servo B Config</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">PWM Step</label>
                        <input type="number" value={params.command_decomposer?.ros__parameters?.gripper_config?.b_pwm_step || 0} onChange={e => handleUpdateNested(['command_decomposer', 'ros__parameters', 'gripper_config', 'b_pwm_step'], parseInt(e.target.value))} className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">PWM Min / Max</label>
                        <div className="flex gap-2">
                          <input type="number" value={params.command_decomposer?.ros__parameters?.gripper_config?.b_pwm_min || 0} onChange={e => handleUpdateNested(['command_decomposer', 'ros__parameters', 'gripper_config', 'b_pwm_min'], parseInt(e.target.value))} className="w-1/2 bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary" placeholder="Min" />
                          <input type="number" value={params.command_decomposer?.ros__parameters?.gripper_config?.b_pwm_max || 0} onChange={e => handleUpdateNested(['command_decomposer', 'ros__parameters', 'gripper_config', 'b_pwm_max'], parseInt(e.target.value))} className="w-1/2 bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary" placeholder="Max" />
                        </div>
                    </div>
                  </div>
              </div>

              {/* Servo C Config */}
              <div className="bg-k3s-dark/50 p-4 border border-k3s-border flex flex-col gap-6">
                  <h3 className="text-sm text-white font-bold tracking-widest uppercase border-b border-white/10 pb-2">Servo C Config</h3>
                  <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">PWM Step</label>
                        <input type="number" value={params.command_decomposer?.ros__parameters?.gripper_config?.c_pwm_step || 0} onChange={e => handleUpdateNested(['command_decomposer', 'ros__parameters', 'gripper_config', 'c_pwm_step'], parseInt(e.target.value))} className="w-full bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary transition-colors" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest block mb-1">PWM Min / Max</label>
                        <div className="flex gap-2">
                          <input type="number" value={params.command_decomposer?.ros__parameters?.gripper_config?.c_pwm_min || 0} onChange={e => handleUpdateNested(['command_decomposer', 'ros__parameters', 'gripper_config', 'c_pwm_min'], parseInt(e.target.value))} className="w-1/2 bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary" placeholder="Min" />
                          <input type="number" value={params.command_decomposer?.ros__parameters?.gripper_config?.c_pwm_max || 0} onChange={e => handleUpdateNested(['command_decomposer', 'ros__parameters', 'gripper_config', 'c_pwm_max'], parseInt(e.target.value))} className="w-1/2 bg-k3s-dark border border-k3s-border p-2 text-sm text-white focus:outline-none focus:border-k3s-primary" placeholder="Max" />
                        </div>
                    </div>
                  </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Gripper A Mapping */}
              <div className="bg-k3s-dark/50 p-4 border border-k3s-border flex flex-col gap-6">
                  <h3 className="text-sm text-white font-bold tracking-widest uppercase border-b border-white/10 pb-2">Gripper A Configuration</h3>
                  <div className="flex flex-col gap-4">
                    {renderArrayInput(['command_decomposer', 'ros__parameters', 'gripper_config', 'initial_gripper_a_values'], 'Initial Values', 3)}
                    {renderArrayInput(['command_decomposer', 'ros__parameters', 'gripper_config', 'gripper_a_mapping'], 'Mapping', 3)}
                    {renderArrayInput(['command_decomposer', 'ros__parameters', 'gripper_config', 'gripper_a_continuous_mapping'], 'Continuous Mapping', 3)}
                  </div>
              </div>

              {/* Gripper B Mapping */}
              <div className="bg-k3s-dark/50 p-4 border border-k3s-border flex flex-col gap-6">
                  <h3 className="text-sm text-white font-bold tracking-widest uppercase border-b border-white/10 pb-2">Gripper B Configuration</h3>
                  <div className="flex flex-col gap-4">
                    {renderArrayInput(['command_decomposer', 'ros__parameters', 'gripper_config', 'initial_gripper_b_values'], 'Initial Values', 3)}
                    {renderArrayInput(['command_decomposer', 'ros__parameters', 'gripper_config', 'gripper_b_mapping'], 'Mapping', 3)}
                    {renderArrayInput(['command_decomposer', 'ros__parameters', 'gripper_config', 'gripper_b_continuous_mapping'], 'Continuous Mapping', 3)}
                  </div>
              </div>
            </div>
          </div>
        )}
      </form>
    );
  };

  const renderDiff = (oldObj: any, newObj: any, recordId?: number) => {
    const oldStr = oldObj ? JSON.stringify(oldObj, null, 2) : '';
    const newStr = newObj ? JSON.stringify(newObj, null, 2) : '';
    const changes = Diff.diffLines(oldStr, newStr);

    const isShowingFull = recordId !== undefined ? showFullContent[recordId] : false;

    if (isShowingFull) {
      return (
        <div className="flex flex-col gap-2">
          <div className="font-mono text-xs whitespace-pre overflow-x-auto bg-black p-4 rounded text-gray-300 border border-[#333]">
            {changes.map((part, index) => {
              if (part.added) return <div key={index} className="bg-green-900/40 text-green-400">+{part.value.replace(/\n$/, '')}</div>;
              if (part.removed) return <div key={index} className="bg-red-900/40 text-red-400">-{part.value.replace(/\n$/, '')}</div>;
              return <div key={index} className="opacity-50"> {part.value.replace(/\n$/, '')}</div>;
            })}
          </div>
          <button 
            onClick={() => recordId !== undefined && setShowFullContent(prev => ({ ...prev, [recordId]: false }))}
            className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest hover:text-white self-end flex items-center gap-1"
          >
            <ChevronUp className="w-3 h-3" /> Hide Full Content
          </button>
        </div>
      );
    }

    // Filter out context lines to show only changes for compact view
    const diffLines = changes.flatMap((part) => {
      const lines = part.value.split('\n').filter(l => l.length > 0);
      return lines.map(line => ({
        content: line,
        added: part.added,
        removed: part.removed
      }));
    });

    const onlyChanges = diffLines.filter(line => line.added || line.removed);

    if (onlyChanges.length === 0) {
      return (
        <div className="text-center py-4 border border-dashed border-k3s-border bg-black/20 text-k3s-muted text-[10px] uppercase tracking-widest">
          No differences found
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="font-mono text-xs whitespace-pre overflow-x-auto bg-black p-4 rounded text-gray-300 border border-[#333]">
          {onlyChanges.map((line, index) => {
            if (line.added) return <div key={index} className="bg-green-900/40 text-green-400">+{line.content}</div>;
            if (line.removed) return <div key={index} className="bg-red-900/40 text-red-400">-{line.content}</div>;
            return null;
          })}
        </div>
        <button 
          onClick={() => recordId !== undefined && setShowFullContent(prev => ({ ...prev, [recordId]: true }))}
          className="text-[10px] font-bold text-k3s-primary uppercase tracking-widest hover:text-white self-end flex items-center gap-1"
        >
          <FileText className="w-3 h-3" /> Show Full Content
        </button>
      </div>
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedBlocks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (activeTab === 'history') {
    return (
      <div className="bg-k3s-block border-2 border-k3s-border p-6 shadow-xl h-full flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-6 border-b-2 border-k3s-border pb-4 shrink-0">
          <div className="flex items-center gap-2 text-k3s-primary font-bold uppercase tracking-widest text-sm">
            <History className="w-5 h-5" />
            <span>Deployment History</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
          {history.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-k3s-border text-k3s-muted text-xs uppercase tracking-widest">
              No historical records found
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {history.map((record, idx) => {
              // The "Active" record is technically the first non-draft record
              const activeRecord = history.find(r => !r.isDraft) || history[0];
              const diffBaseRecord = activeRecord;
              const isExpanded = expandedDiffs[record.id];
              const date = new Date(record.createdAt).toLocaleString();
              
              // We consider a record "Active" visually if it is the first non-draft record
              const isActive = activeRecord && record.id === activeRecord.id;

              return (
                <div key={record.id} className={`border ${record.isDraft ? 'border-k3s-secondary/50 border-dashed' : 'border-k3s-border'} bg-black/40 overflow-hidden`}>
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#111] transition-colors"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          {record.versionName || `Update - ${date}`}
                          {record.isDraft && (
                             <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 border border-blue-500/30 rounded">
                               Draft
                             </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-1 text-k3s-muted text-[10px] uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            {date}
                          </div>
                          {idx !== 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(() => {
                                const activeRecord = history[0];
                                const oldStr = activeRecord ? JSON.stringify(activeRecord.parameters, null, 2) : '';
                                const newStr = JSON.stringify(record.parameters, null, 2);
                                const changes = Diff.diffLines(oldStr, newStr);
                                const added = changes.filter(p => p.added).length;
                                const removed = changes.filter(p => p.removed).length;
                                const changedCount = added + removed;
                                if (changedCount === 0) return null;
                                return (
                                  <span className="text-[9px] font-bold text-k3s-primary/80 bg-k3s-primary/5 px-1 border border-k3s-primary/20">{changedCount} lines changed</span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {isActive && (
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-1 border border-green-500/30">
                          Active
                        </span>
                      )}
                      {!isActive && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); resumeEditing(record); }}
                            className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest hover:text-white px-2 py-1 border border-k3s-border hover:border-k3s-muted transition-colors"
                          >
                            Resume Edit
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); submitToDeploy(record); }}
                            className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest bg-yellow-500/10 px-2 py-1 border border-yellow-500/30 hover:bg-yellow-500 hover:text-black transition-colors"
                          >
                            Deploy
                          </button>
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-k3s-muted" /> : <ChevronDown className="w-5 h-5 text-k3s-muted" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t border-[#333]">
                      <div className="text-[10px] font-bold text-k3s-muted uppercase tracking-widest mb-3 flex items-center justify-between">
                        <span>{isActive ? 'Active Configuration' : 'Changes compared to Active Configuration'}</span>
                      </div>
                      {isActive ? (
                        <div className="text-center py-4 border border-dashed border-k3s-border bg-black/20 text-k3s-muted text-[10px] uppercase tracking-widest">
                          This is the currently deployed configuration
                        </div>
                      ) : (
                        renderDiff(diffBaseRecord?.parameters, record.parameters, record.id)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // EXACT layout and wording matching the school project's Configurator Editor pane
  return (
    <div className="flex flex-col xl:flex-row gap-8 h-full min-h-0">
      {/* Sidebar-like view toggle exactly like school project */}
      <div className="flex flex-col gap-2 w-full xl:w-64 shrink-0">
        <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-4 border-b-2 border-k3s-border pb-2">Config</h2>
        <div className="flex xl:flex-col gap-2 overflow-x-auto pb-4 xl:pb-0">
          <button 
            onClick={() => handleModeChange('pid')} 
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${viewMode === 'pid' ? 'bg-k3s-primary text-black' : 'bg-k3s-block text-k3s-muted hover:bg-k3s-border border border-k3s-border'}`}
          >
            <LayoutList className="w-4 h-4 shrink-0" /> PID Systems
          </button>
          <button 
            onClick={() => handleModeChange('thruster')} 
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${viewMode === 'thruster' ? 'bg-k3s-primary text-black' : 'bg-k3s-block text-k3s-muted hover:bg-k3s-border border border-k3s-border'}`}
          >
            <LayoutList className="w-4 h-4 shrink-0" /> Thrusterboard
          </button>
          <button 
            onClick={() => handleModeChange('ahrs')} 
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${viewMode === 'ahrs' ? 'bg-k3s-primary text-black' : 'bg-k3s-block text-k3s-muted hover:bg-k3s-border border border-k3s-border'}`}
          >
            <LayoutList className="w-4 h-4 shrink-0" /> AHRS Driver
          </button>
          <button 
            onClick={() => handleModeChange('gripper')} 
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${viewMode === 'gripper' ? 'bg-k3s-primary text-black' : 'bg-k3s-block text-k3s-muted hover:bg-k3s-border border border-k3s-border'}`}
          >
            <LayoutList className="w-4 h-4 shrink-0" /> Gripper System
          </button>
          <div className="h-px bg-k3s-border my-2 hidden xl:block"></div>
          <button 
            onClick={() => handleModeChange('raw')} 
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${viewMode === 'raw' ? 'bg-k3s-primary text-black' : 'bg-k3s-block text-k3s-muted hover:bg-k3s-border border border-k3s-border'}`}
          >
            <FileJson className="w-4 h-4 shrink-0" /> Raw Editor
          </button>
        </div>
      </div>

      <div className="flex-1 w-full relative flex flex-col min-h-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 border-b-2 border-k3s-primary pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-k3s-primary" />
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Robot Parameters</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="(Optional) Version Name"
                className="bg-black border border-k3s-border px-3 py-1.5 text-xs text-white focus:outline-none focus:border-k3s-primary w-48 mr-2 h-9"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
              />
            </div>
            
            <button
               type="button"
               onClick={() => handleSave(true)}
               disabled={(viewMode === 'raw' && !!parseError) || isSaving}
               className="flex items-center gap-2 bg-k3s-block border border-k3s-border text-k3s-primary hover:bg-k3s-primary/10 px-4 py-2 font-bold uppercase text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed h-9"
            >
              <FileText className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save as draft'}</span>
            </button>
            <button
               type="button"
               onClick={() => handleSave(false)}
               disabled={(viewMode === 'raw' && !!parseError) || isSaving}
               className="flex items-center gap-2 bg-k3s-primary text-black hover:bg-white px-4 py-2 font-bold uppercase text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed h-9"
            >
              {isSaving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Deploying...' : 'Deploy'}</span>
            </button>
          </div>
        </div>

        {saveError && (
          <div className="mb-4 bg-red-950/40 border border-red-500/50 p-3 text-red-400 text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4" />
            {saveError}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-k3s-block border-2 border-k3s-border p-6 shadow-xl mb-8">
             {viewMode !== 'raw' ? renderForm() : (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-k3s-muted uppercase tracking-widest block flex items-center justify-between">
                    <span>Raw JSON Data</span>
                  </label>
                  <textarea 
                    value={currentText}
                    onChange={handleTextChange}
                    className={`w-full min-h-[500px] bg-black border-2 ${parseError ? 'border-red-500' : 'border-k3s-border focus:border-k3s-primary'} p-4 font-mono text-xs text-k3s-muted focus:outline-none resize-y`}
                    spellCheck="false"
                  />
                  {parseError && (
                    <div className="absolute bottom-10 right-4 bg-red-950/80 text-red-500 text-[10px] px-3 py-1 font-bold tracking-wider border border-red-500/30 shadow-lg">
                      {parseError}
                    </div>
                  )}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

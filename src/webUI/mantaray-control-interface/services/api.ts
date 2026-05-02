// A simple fetch-based API client matching the Flask Backend

const API_BASE_URL = 'http://localhost:5000/api/parameters';

export interface RobotParameterDTO {
  id: number;
  versionName: string | null;
  parameters: any;
  createdAt: string;
}

export const fetchLatestParams = async (): Promise<RobotParameterDTO | null> => {
  try {
    const response = await fetch(API_BASE_URL);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch latest parameters');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
};

export const fetchParamHistory = async (): Promise<RobotParameterDTO[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/history`);
    if (!response.ok) throw new Error('Failed to fetch parameter history');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

export const saveParams = async (
  parameters: any,
  versionName?: string
): Promise<RobotParameterDTO> => {
  const payload = {
    version_name: versionName,
    parameters: parameters,
  };

  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to save parameters');
  }

  const result = await response.json();
  return result.data;
};

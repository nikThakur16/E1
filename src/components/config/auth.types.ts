export interface AuthResponse {
    status?: string;
    url?: string;
    isPaused?: boolean;
    hasRecording?: boolean;
    hasData?: boolean;
    data?: string;
    elapsedMs?:string |number;
}
import type { SipConfig } from "../types/sip.types";

export interface ProvisioningResult {
    extension: string;
    userid: string;
    termpass: string;
}

export class ProvisioningService {
    private config: SipConfig;
    private log: (message: string) => void;

    constructor(config: SipConfig, logger: (message: string) => void = console.log) {
        this.config = config;
        this.log = (msg) => logger(`[ProvisioningService] ${msg}`);
    }

    public async provision(): Promise<ProvisioningResult> {
        const { domain, username, password } = this.config;
        if (!domain) {
            throw new Error("Domain is required for provisioning");
        }

        const isLocalhost = window.location.hostname === 'localhost';
        const url = isLocalhost 
            ? `${window.location.origin}/proxy/${domain}/`
            : `https://${domain}.ringotel.co/`;
            
        this.log(`Starting provisioning request to ${url}...`);

        const authStr = `${username}:${password}`;
        const authBase64 = btoa(authStr);

        try {
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Basic ${authBase64}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    method: "getUserProfile",
                    params: {}
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const data = await response.json();
            this.log(`Provisioning response received`);

            if (data.result && data.result.profile) {
                const { extension, userid } = data.result.profile;
                const { termpass } = data.result;

                if (!extension || !userid || !termpass) {
                    throw new Error("Incomplete provisioning data received");
                }

                this.log(`Provisioning successful for extension ${extension}`);
                return { extension, userid, termpass };
            } else {
                throw new Error(data.error ? JSON.stringify(data.error) : "Invalid response format");
            }
        } catch (error) {
            this.log(`Provisioning error: ${(error as Error).message}`);
            throw error;
        }
    }
}

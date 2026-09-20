export interface IStorageLocal {
    get: <T = unknown>(k: string) => T | null;
    set: (k: string, v: unknown) => void;
    setString: (k: string, v: string) => void;
    getString: (k: string) => string | null;
    remove: (k: string) => void;
    clear: () => void;
}

export interface IStorageSession {
    get: <T = unknown>(k: string) => T | null;
    set: (k: string, v: unknown) => void;
    getString: (k: string) => string | null;
    remove: (k: string) => void;
    clear: () => void;
}

export const appStorage = () => {
    const local: IStorageLocal = {
        get<T = unknown>(k: string): T | null {
            try {
                return JSON.parse(localStorage.getItem(k) as string) as T;
            } catch (e) {
                console.error('Error getting local storage:', e);
                return null;
            }
        },

        set(k: string, v: unknown) {
            localStorage.setItem(k, JSON.stringify(v));
        },

        setString(k: string, v: string) {
            localStorage.setItem(k, v);
        },

        getString(k: string) {
            try {
                return localStorage.getItem(k);
            } catch (e) {
                console.error('Error getting local storage:', e);
                return null;
            }
        },
        remove(k: string) {
            try {
                return localStorage.removeItem(k);
            } catch (e) {
                console.error('Error removing local storage:', e);
                return null;
            }
        },
        clear() {
            try {
                return localStorage.clear();
            } catch (e) {
                console.error('Error clearing local storage:', e);
                return null;
            }
        }
    };

    const session: IStorageSession = {
        get<T = unknown>(k: string): T | null {
            try {
                return JSON.parse(sessionStorage.getItem(k) as string) as T;
            } catch (e) {
                console.error('Error getting session storage:', e);
                return null;
            }
        },

        set(k: string, v: unknown) {
            sessionStorage.setItem(k, JSON.stringify(v));
        },

        getString(k: string) {
            try {
                return sessionStorage.getItem(k);
            } catch (e) {
                console.error('Error getting session storage:', e);
                return null;
            }
        },
        remove(k: string) {
            try {
                return sessionStorage.removeItem(k);
            } catch (e) {
                console.error('Error removing session storage:', e);
                return null;
            }
        },
        clear() {
            try {
                return sessionStorage.clear();
            } catch (e) {
                console.error('Error clearing session storage:', e);
                return null;
            }
        }
    };

    return {
        local,
        session
    };
};

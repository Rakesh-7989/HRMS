declare module '@cashfreepayments/cashfree-js' {
    export function load(options: { mode: 'sandbox' | 'production' }): Promise<Cashfree>;

    export interface Cashfree {
        checkout(options: CheckoutOptions): Promise<void>;
    }

    export interface CheckoutOptions {
        paymentSessionId: string;
        redirectTarget: '_self' | '_modal' | '_blank';
        appearance?: {
            width?: string;
            height?: string;
        };
    }
}

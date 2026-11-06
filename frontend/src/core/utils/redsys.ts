export interface RedsysForm {
  payment_url: string;
  ds_signature_version: string;
  ds_merchant_parameters: string;
  ds_signature: string;
}

export const submitRedsysForm = (response: RedsysForm): void => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = response.payment_url;
  const fields: Record<string, string> = {
    Ds_SignatureVersion: response.ds_signature_version,
    Ds_MerchantParameters: response.ds_merchant_parameters,
    Ds_Signature: response.ds_signature,
  };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
};

interface UpdateToasts {
  updated: string;
  annulled: string;
  reactivated: string;
}

export const updateToast = (data: { annulled?: boolean }, toasts: UpdateToasts): string => {
  if (data.annulled === undefined) return toasts.updated;
  return data.annulled ? toasts.annulled : toasts.reactivated;
};

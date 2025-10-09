// types.ts
export type UploadData =
  | { type: "audio"; file: File }
  | { type: "video"; file: File }
  | { type: "image"; file: File }
  | { type: "pdf"; file: File }
  | { type: "url"; url: string }
  | { type: "text"; text: string };

import { BannerGallery } from "@/components/BannerGallery";
import files from "./files.json";

export default function Page() {
  return (
    <BannerGallery
      title="Banner experiments v2 — stepwise light validation"
      assetDir="/banner-experiments-v2"
      files={files}
    />
  );
}

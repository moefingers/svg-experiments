import { BannerGallery } from "@/components/BannerGallery";
import files from "./files.json";

export default function Page() {
  return (
    <BannerGallery
      title="Verified banner experiments"
      assetDir="/verified-banner-experiments"
      files={files}
    />
  );
}

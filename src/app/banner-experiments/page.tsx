import { BannerGallery } from "@/components/BannerGallery";
import files from "./files.json";

export default function Page() {
  return (
    <BannerGallery
      title="Banner experiments"
      assetDir="/banner-experiments"
      files={files}
    />
  );
}

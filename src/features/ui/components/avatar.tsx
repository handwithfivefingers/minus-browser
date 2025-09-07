import { useRef } from "react";

interface IAvatar {
  src?: string;
  size?: number;
  alt?: string;
}
export const Avatar = (props: IAvatar) => {
  const blockRef = useRef<HTMLDivElement>(null);
  return (
    <div
      className="relative  rounded"
      style={{
        width: props.size || 20,
        background: "var(--color-slate-300)",
      }}
      ref={blockRef}
    >
      <span className="block pb-[100%]" />
      {props.src && (
        <img
          src={props?.src}
          alt={props.alt || "Avatar"}
          className="absolute top-0 left-0 w-full h-full"
          onLoad={() => {
            if (!blockRef.current) return;
            blockRef.current.style.background = "transparent";
          }}
          onError={() => {
            if (!blockRef.current) return;
            blockRef.current.style.background = "var(--color-slate-300)";
          }}
          style={{ objectFit: "cover" }}
        />
      )}
    </div>
  );
};

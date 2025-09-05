import React from "react";

interface IAvatar {
  src?: string;
  size?: number;
  alt?: string;
}
export const Avatar = (props: IAvatar) => {
  return (
    <div
      className="relative bg-slate-300 rounded"
      style={{
        width: props.size || 20,
      }}
    >
      <span className="block pb-[100%]" />
      {props.src && <img src={props.src} alt={props.alt || "Avatar"} className="absolute top-0 left-0 w-full h-full" />}
    </div>
  );
};

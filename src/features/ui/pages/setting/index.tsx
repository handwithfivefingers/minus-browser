const Setting = () => {
  return (
    <div className="relative bg-slate-800 h-full w-full">
      <div className="bg-slate-100 w-full h-full rounded-lg p-8">
        <h1 className="font-bold text-xl py-4">Setting</h1>
        <div className="flex gap-2">
          <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col">
            <div className="flex gap-2 w-full justify-between">
              <span>Sync data:</span>
              <select className="bg-slate-300 rounded px-2 w-24">
                <option>15 Sec</option>
                <option>30 Sec</option>
                <option>45 Sec</option>
                <option>1 Min</option>
                <option>Off</option>
              </select>
            </div>

            <div className="flex gap-2 w-full justify-between" >
              <span>Font size:</span>
              <select className="bg-slate-300 rounded px-2 w-24">
                <option>8</option>
                <option>12</option>
                <option>16</option>
                <option>20</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;

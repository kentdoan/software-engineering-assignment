import React from 'react';

interface PrivateVehicleFormProps {
  visible: boolean;
  plate: string;
  model: string;
  chargerType: string;
  capacityKwh: string;
  onChangePlate: (value: string) => void;
  onChangeModel: (value: string) => void;
  onChangeChargerType: (value: string) => void;
  onChangeCapacityKwh: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Mục đích: Biểu mẫu thu gọn cho phép sinh viên đăng ký phương tiện điện cá nhân mới vào hồ sơ sạc.
 */
export const PrivateVehicleForm: React.FC<PrivateVehicleFormProps> = ({
  visible,
  plate,
  model,
  chargerType,
  capacityKwh,
  onChangePlate,
  onChangeModel,
  onChangeChargerType,
  onChangeCapacityKwh,
  onSubmit,
}) => {
  if (!visible) return null;

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-3xl border border-[#ccebdd] bg-[#e6f5ee] p-5 sm:grid-cols-5"
    >
      <input
        required
        value={plate}
        onChange={(e) => onChangePlate(e.target.value)}
        placeholder="Biển số (59-MD1-...)"
        className="rounded-xl border border-[#dfe5e1] bg-white px-3 py-2 text-xs outline-none focus:border-[#006a4e]"
      />
      <input
        required
        value={model}
        onChange={(e) => onChangeModel(e.target.value)}
        placeholder="Mẫu xe (VD: Feliz S)"
        className="rounded-xl border border-[#dfe5e1] bg-white px-3 py-2 text-xs outline-none focus:border-[#006a4e]"
      />
      <select
        value={chargerType}
        onChange={(e) => onChangeChargerType(e.target.value)}
        className="rounded-xl border border-[#dfe5e1] bg-white px-3 py-2 text-xs outline-none focus:border-[#006a4e]"
      >
        <option value="STANDARD">Chuẩn Phổ thông</option>
        <option value="TYPE_2">Chuẩn Type 2</option>
        <option value="FAST_DC">Sạc nhanh DC</option>
      </select>
      <input
        type="number"
        step="0.1"
        min="1"
        value={capacityKwh}
        onChange={(e) => onChangeCapacityKwh(e.target.value)}
        placeholder="Dung lượng (kWh)"
        className="rounded-xl border border-[#dfe5e1] bg-white px-3 py-2 text-xs outline-none focus:border-[#006a4e]"
      />
      <button
        type="submit"
        className="rounded-full bg-[#006a4e] px-4 py-2 text-xs font-bold text-white hover:bg-[#00513b]"
      >
        Lưu phương tiện
      </button>
    </form>
  );
};

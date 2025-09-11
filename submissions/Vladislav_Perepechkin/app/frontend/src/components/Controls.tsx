import SelectImeiButton from "./SelectImeiButton";
import type { SelectImeiButtonProps, SelectStartButtonProps } from '../types/types';
import SelectStartButton from "./SelectStartButton";

const Controls = ({
    availableImeis,
    selectedImei,
    setSelectedImei,
    start,
    setStart
}: SelectImeiButtonProps & SelectStartButtonProps) => {
    return (
        <div className="flex justify-start gap-3 p-5 bg-white w-full">
            <SelectImeiButton
                availableImeis={availableImeis}
                selectedImei={selectedImei}
                setSelectedImei={setSelectedImei}
            />
            <SelectStartButton
                start={start}
                setStart={setStart}
            />
        </div>
    );
};

export default Controls;
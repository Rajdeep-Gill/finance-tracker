import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";

import { FileSearch, PieChart, Radar, Target } from "lucide-react";

import { AreaVariant } from "./area-variant";
import { BarVariant } from "./bar-variant";
import { LineVariant } from "./line-variant";
import { PieVariant } from "./pie-variant";
import { RadarVariant } from "./rada-variant";
import { RadialVariant } from "./radial-variant";

type Props = {
  data?: {
    name: string,
    value: number,
  }[];
};

export const SpendingPie = ({ data = [] }: Props) => {
  const [chartType, setChartType] = useState("pie");

  const onTypeChange = (type: string) => {
    setChartType(type);
  };

  console.log(data);

  return (
    <div>
      <Card className="border-none drop-shadow-sm">
        <CardHeader className="flex space-y-2 lg:space-y-0 lg:flex-row lg:items-center justify-between">
          <CardTitle className="text-xl line-clamp-1">Transactions</CardTitle>
          <Select defaultValue={chartType} onValueChange={onTypeChange}>
            <SelectTrigger className="lg:w-auto h-9 rounded-md px-3">
              <SelectValue placeholder="Chart Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pie">
                <div className="flex items-center">
                  <PieChart className="mr-2 size-4 shrink-0" />
                  <p className="line-clamp-1">Pie Chart</p>
                </div>
              </SelectItem>
              <SelectItem value="radar">
                <div className="flex items-center">
                  <Radar className="mr-2 size-4 shrink-0" />
                  <p className="line-clamp-1">Radar Chart</p>
                </div>
              </SelectItem>
              <SelectItem value="radial">
                <div className="flex items-center">
                  <Target className="mr-2 size-4 shrink-0" />
                  <p className="line-clamp-1">Radial</p>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex flex-col gap-y-4 items-center justify-center h-[350px] w-full">
              <FileSearch className="size-6 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No data available</p>
            </div>
          ) : (
            <>
              {chartType == "pie" && <PieVariant data={data} />}
              {chartType == "radar" && <RadarVariant data={data} />}
              {chartType == "radial" && <RadialVariant data={data} />}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

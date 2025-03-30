interface YmlConfig  {
    name:string
    defaultValue:boolean
    description:string
    moreDetail:string
};
interface HintValue {
    // 值
    value: string;
    // 描述
    description: string;
}
interface HintType {
    // 名称
    name: string;
    // 提示数组
    values: HintValue[];
}

export { YmlConfig, HintValue, HintType };
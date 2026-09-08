import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DivisionResultInput, type DivisionValues } from "./DivisionResultInput";
function Form() {
  const [values,setValues]=useState<DivisionValues>({numerator:null,denominator:null});
  return <DivisionResultInput name="Costo por contenedor" inputs={[{name:"Costo",unit:"USD"},{name:"Contenedores",unit:"unidad"}]} unit="USD/contenedor" values={values} disabled={false} onChange={setValues}/>;
}
describe("Division entry",()=>{
  it("labels the ordered inputs and previews the quotient, pending and zero denominator",()=>{
    render(<Form/>);
    const result=screen.getByLabelText("Resultado calculado para Costo por contenedor");
    expect(result).toHaveTextContent("Pendiente");
    fireEvent.change(screen.getByLabelText("Numerador Costo para Costo por contenedor"),{target:{value:"50000"}});
    fireEvent.change(screen.getByLabelText("Denominador Contenedores para Costo por contenedor"),{target:{value:"2000"}});
    expect(result).toHaveTextContent("25 USD/contenedor");
    fireEvent.change(screen.getByLabelText("Denominador Contenedores para Costo por contenedor"),{target:{value:"0"}});
    expect(result).toHaveTextContent("NOT_CALCULABLE");
    expect(result).not.toHaveTextContent("Infinity");
  });
});

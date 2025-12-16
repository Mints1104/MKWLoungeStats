import { useState } from "react";


function TableInfo() {
    const [tableId, setTableId] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState("");



    const getTableInfo = async () => {

        try {
            setLoading(true);
            setResult(null);
            setError("");

        if(!tableId.trim()) {
            setError("Please enter a table ID");
            return;
        }

        const response = await fetch(`/api/table?tableid=${encodeURIComponent(tableId)}`)

        if (!response.ok) {
            throw new Error("Failed to fetch table data");
        }
        const data = await response.json()
        setResult(data)
        setLoading(false)

        console.log(data)



    }
    catch(err) {
        setError(err.message || "Failed to fetch table");
    }


    }





    return (
        <>

        {error && (

            <p style={{color: "red"}}>{error}</p>
        )}
        {loading && (
            <p>Loading...</p>
        )}

        {result && (
            <p>Created On: {result.createdOn}</p>
        )}
        
        </>
    )
}

export default TableInfo;
import os
import math
import fitz  # PyMuPDF

def combine_pdfs():
    input_dir = r"c:\Users\lucas\Downloads\certificados_1779124995566"
    output_pdf = r"c:\laragon\www\certificafacil\certificados_combinados.pdf"
    
    if not os.path.exists(input_dir):
        print(f"Diretório não encontrado: {input_dir}")
        return

    # Get all PDF files
    pdf_files = [f for f in os.listdir(input_dir) if f.lower().endswith('.pdf')]
    pdf_files.sort()
    
    if not pdf_files:
        print("Nenhum arquivo PDF encontrado no diretório.")
        return
        
    print(f"Encontrados {len(pdf_files)} certificados para processar...")
    
    # A4 dimensions in points (Portrait)
    A4_W = 595.28
    A4_H = 841.89
    
    cols = 2
    rows = 2
    per_page = cols * rows
    
    out_doc = fitz.open()
    
    for i in range(0, len(pdf_files), per_page):
        batch = pdf_files[i:i+per_page]
        
        # Create a blank A4 page
        blank_page = out_doc.new_page(width=A4_W, height=A4_H)
        
        for idx, filename in enumerate(batch):
            path = os.path.join(input_dir, filename)
            src_doc = fitz.open(path)
            if len(src_doc) == 0:
                continue
            
            src_page = src_doc[0]
            cert_rect = src_page.rect
            cert_w = cert_rect.width
            cert_h = cert_rect.height
            
            # Target size for each cell
            cell_w = A4_W / cols
            cell_h = A4_H / rows
            
            # Scale factor to fit inside cell with a small margin
            scale_x = cell_w / cert_w
            scale_y = cell_h / cert_h
            scale = min(scale_x, scale_y) * 0.95 
            
            scaled_w = cert_w * scale
            scaled_h = cert_h * scale
            
            col = idx % cols
            row = idx // cols
            
            # Calculate position to center in the cell
            x_offset = col * cell_w + (cell_w - scaled_w) / 2
            y_offset = row * cell_h + (cell_h - scaled_h) / 2
            
            target_rect = fitz.Rect(
                x_offset, 
                y_offset, 
                x_offset + scaled_w, 
                y_offset + scaled_h
            )
            
            # Show the source page in the target rectangle
            blank_page.show_pdf_page(target_rect, src_doc, 0)
            src_doc.close()
            
    out_doc.save(output_pdf)
    
    num_pages = len(out_doc)
    out_doc.close()

    print(f"Sucesso! Combinados {len(pdf_files)} certificados em {num_pages} páginas.")
    print(f"Salvo em: {output_pdf}")

if __name__ == "__main__":
    combine_pdfs()
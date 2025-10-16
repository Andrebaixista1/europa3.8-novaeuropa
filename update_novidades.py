from pathlib import Path
import re

path = Path("src/components/NovidadesModal.tsx")
text = path.read_text(encoding="utf-8")
pattern = r"const novidades = \[.*?\];"
new_block = """const novidades = [
    {
      data: \"16/10\",
      titulo: \"Europa 4.0 lan\\u00E7ado!\",
      descricao: \"A nova vers\\u00E3o j\\u00E1 est\\u00E1 dispon\\u00EDvel, com um novo design, novas fun\\u00E7\\u00F5es, sistema hier\\u00E1rquico e muito mais!\\nVeja se sua equipe j\\u00E1 tem dispon\\u00EDvel confirmando com o Andr\\u00E9 do planejamento.\",
      link: \"https://europa4.vercel.app/\"
    },
    {
      data: \"06/10\",
      titulo: \"Nova vers\\u00E3o do Europa chegando!\",
      descricao: \"Uma nova vers\\u00E3o do Europa vem por a\\u00ED, a vers\\u00E3o 4.0 vem com um novo design, novas fun\\u00E7\\u00F5es, sistema hier\\u00E1rquico e muito mais!\"
    }
  ];"""
text, count = re.subn(pattern, lambda _: new_block, text, flags=re.S)
if count != 1:
    raise SystemExit("Novidades block not replaced")
old_block = """                      <h3 className=\"font-semibold text-gray-800 mb-2\">
                        {novidade.titulo}
                      </h3>
                      <p className=\"text-gray-600 text-sm leading-relaxed\">
                        {novidade.descricao}
                      </p>""".replace("\n", "\r\n")
new_block2 = """                      {novidade.link ? (
                        <a
                          href={novidade.link}
                          target=\"_blank\"
                          rel=\"noopener noreferrer\"
                          className=\"font-semibold text-blue-600 hover:underline mb-2 inline-flex items-center gap-2\"
                        >
                          {novidade.titulo}
                        </a>
                      ) : (
                        <h3 className=\"font-semibold text-gray-800 mb-2\">
                          {novidade.titulo}
                        </h3>
                      )}
                      <p className=\"text-gray-600 text-sm leading-relaxed whitespace-pre-line\">
                        {novidade.descricao}
                      </p>""".replace("\n", "\r\n")
if old_block not in text:
    raise SystemExit("Target block not found")
text = text.replace(old_block, new_block2)
path.write_text(text, encoding="utf-8")

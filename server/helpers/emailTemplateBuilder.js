export default function templateBuilder(content = [], footer = []) {
  // content - array of strings, footer - array of strings
  const contentHtml = content.reduce((res, currentValue) => `${res}<p>${currentValue}</p>`, '');
  const footerHtml = footer.reduce((res, currentValue) => `${res}<p>${currentValue}</p>`, '');
  // bootstrap classes would be transform to inline-css
  return `
  <table class="table table-bordered" style="background-color: #f6f6f6;">
    <tbody>
      <tr>
        <td align="center">
          <table class="table table-bordered" style="max-width: 600px;">
            <tbody>
              <tr>
                <td align="center">
                  ${contentHtml}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table class="table" style="background-color: #f6f6f6;">
            <tbody>
              <tr>
                <td class="text-muted" align="center" style="border-top: 0;">
                  ${footerHtml}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>`;
}

import { GlobalConfig } from '../models';

export default async function addStandardFooter(done) {
  try {
    // find global config
    const gc = await GlobalConfig.model.findOne();
    gc.footer = {
      en:
        '<table class="table" style="background-color: #f6f6f6; margin-bottom: 0;">' +
        '<tr>' +
        '<tr>' +
        '<td class="text-muted" align="center" style="border-top: 0;">' +
        '${text}' +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>' +
        '${companyName}' +
        '</td>' +
        '</tr>' +
        '</tbody>' +
        '</table>',
      de:
        '<table class="table" style="background-color: #f6f6f6; margin-bottom: 0;">' +
        '<tr>' +
        '<tr>' +
        '<td class="text-muted" align="center" style="border-top: 0;">' +
        '${text}' +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>' +
        '${companyName}' +
        '</td>' +
        '</tr>' +
        '</tbody>' +
        '</table>',
      ru:
        '<table class="table" style="background-color: #f6f6f6; margin-bottom: 0;">' +
        '<tr>' +
        '<tr>' +
        '<td class="text-muted" align="center" style="border-top: 0;">' +
        '${text}' +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>' +
        '${companyName}' +
        '</td>' +
        '</tr>' +
        '</tbody>' +
        '</table>',
      nl:
        '<table class="table" style="background-color: #f6f6f6; margin-bottom: 0;">' +
        '<tr>' +
        '<tr>' +
        '<td class="text-muted" align="center" style="border-top: 0;">' +
        '${text}' +
        '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>' +
        '${companyName}' +
        '</td>' +
        '</tr>' +
        '</tbody>' +
        '</table>',
    };

    await gc.save();
    done();
  } catch (e) {
    done(e);
  }
}
